// Scan path rules for the probe UI. These mirror createProbeXYPoints() in
// src/server/lib/autolevel.js. The server module cannot be imported here: it pulls
// in the server logger and the G-code parser, so this file repeats the visit order
// to draw the preview before a controller is connected. Keep the two in step when
// a pattern changes; an end-to-end run is the place to check the drawn path
// matches the probed path.

const FLOAT_EPSILON = 1e-10;

export const SCAN_PATTERNS = [
  'raster',
  'zigzag',
  'spiral-in',
  'spiral-out',
];

export const SCAN_DIRECTIONS = ['x', 'y'];

const createAxisPositions = (start, end, step) => {
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    !Number.isFinite(step) ||
    step <= 0
  ) {
    throw new RangeError(
      'Axis start, end, and step must be finite, with step > 0',
    );
  }

  if (end < start) {
    throw new RangeError('Axis end must be greater than or equal to start');
  }

  const count = Math.floor((end - start) / step + FLOAT_EPSILON);

  return Array.from({ length: count + 1 }, (_, index) => {
    const value = start + index * step;

    // Prevent values such as 0.30000000000000004.
    return Math.abs(value - end) <= FLOAT_EPSILON ? end : value;
  });
};

const createRasterPositions = ({ xPositions, yPositions, scanDirection }) => {
  const positions = [];

  if (scanDirection === 'x') {
    for (const y of yPositions) {
      for (const x of xPositions) {
        positions.push({ x, y });
      }
    }

    return positions;
  }

  for (const x of xPositions) {
    for (const y of yPositions) {
      positions.push({ x, y });
    }
  }

  return positions;
};

const createZigzagPositions = ({ xPositions, yPositions, scanDirection }) => {
  const positions = [];

  if (scanDirection === 'x') {
    for (let row = 0; row < yPositions.length; row += 1) {
      const y = yPositions[row];

      if (row % 2 === 0) {
        for (const x of xPositions) {
          positions.push({ x, y });
        }
      } else {
        for (let index = xPositions.length - 1; index >= 0; index -= 1) {
          positions.push({
            x: xPositions[index],
            y,
          });
        }
      }
    }

    return positions;
  }

  for (let column = 0; column < xPositions.length; column += 1) {
    const x = xPositions[column];

    if (column % 2 === 0) {
      for (const y of yPositions) {
        positions.push({ x, y });
      }
    } else {
      for (let index = yPositions.length - 1; index >= 0; index -= 1) {
        positions.push({
          x,
          y: yPositions[index],
        });
      }
    }
  }

  return positions;
};

const createSpiralInPositions = ({ xPositions, yPositions, scanDirection }) => {
  if (xPositions.length === 0 || yPositions.length === 0) {
    return [];
  }

  const grid = yPositions.map((y) => (
    xPositions.map((x) => ({ x, y }))
  ));

  const positions = [];

  let top = 0;
  let bottom = grid.length - 1;
  let left = 0;
  let right = grid[0].length - 1;

  while (top <= bottom && left <= right) {
    if (scanDirection === 'x') {
      // Move +X.
      for (let column = left; column <= right; column += 1) {
        positions.push(grid[top][column]);
      }
      top += 1;

      // Move +Y.
      for (let row = top; row <= bottom; row += 1) {
        positions.push(grid[row][right]);
      }
      right -= 1;

      // Move -X.
      if (top <= bottom) {
        for (let column = right; column >= left; column -= 1) {
          positions.push(grid[bottom][column]);
        }
        bottom -= 1;
      }

      // Move -Y.
      if (left <= right) {
        for (let row = bottom; row >= top; row -= 1) {
          positions.push(grid[row][left]);
        }
        left += 1;
      }
    } else {
      // Move +Y.
      for (let row = top; row <= bottom; row += 1) {
        positions.push(grid[row][left]);
      }
      left += 1;

      // Move +X.
      for (let column = left; column <= right; column += 1) {
        positions.push(grid[bottom][column]);
      }
      bottom -= 1;

      // Move -Y.
      if (left <= right) {
        for (let row = bottom; row >= top; row -= 1) {
          positions.push(grid[row][right]);
        }
        right -= 1;
      }

      // Move -X.
      if (top <= bottom) {
        for (let column = right; column >= left; column -= 1) {
          positions.push(grid[top][column]);
        }
        top += 1;
      }
    }
  }

  return positions;
};

const createSpiralOutPositions = (options) => {
  const spiralInPositions = createSpiralInPositions(options);
  const positions = [];

  for (
    let index = spiralInPositions.length - 1;
    index >= 0;
    index -= 1
  ) {
    positions.push(spiralInPositions[index]);
  }

  return positions;
};

/**
 * Build the probe visit order for a scan pattern and direction.
 *
 * @param {object} options
 * @param {number} options.startX
 * @param {number} options.endX
 * @param {number} options.stepX
 * @param {number} options.startY
 * @param {number} options.endY
 * @param {number} options.stepY
 * @param {'x'|'y'} [options.scanDirection='x']
 * @param {'raster'|'zigzag'|'spiral-in'|'spiral-out'} [options.scanPattern='raster']
 * @returns {{x: number, y: number}[]} Points in probe order
 */
export const createScanPath = (options = {}) => {
  const {
    startX = 0,
    endX = 0,
    stepX = 10,
    startY = 0,
    endY = 0,
    stepY = 10,
    scanDirection = 'x',
    scanPattern = 'raster',
  } = options;

  if (!SCAN_DIRECTIONS.includes(scanDirection)) {
    throw new RangeError(`Unsupported scan direction: ${scanDirection}`);
  }

  if (!SCAN_PATTERNS.includes(scanPattern)) {
    throw new RangeError(`Unsupported scan pattern: ${scanPattern}`);
  }

  const scanOptions = {
    xPositions: createAxisPositions(startX, endX, stepX),
    yPositions: createAxisPositions(startY, endY, stepY),
    scanDirection,
  };

  switch (scanPattern) {
    case 'raster':
      return createRasterPositions(scanOptions);
    case 'zigzag':
      return createZigzagPositions(scanOptions);
    case 'spiral-in':
      return createSpiralInPositions(scanOptions);
    case 'spiral-out':
      return createSpiralOutPositions(scanOptions);
    default:
      throw new RangeError(`Unsupported scan pattern: ${scanPattern}`);
  }
};

/**
 * First and last point of the probe path. Both are null when the grid is empty.
 *
 * @param {object} options Same options as createScanPath
 * @returns {{start: {x: number, y: number}|null, end: {x: number, y: number}|null}}
 */
export const getScanPathEndpoints = (options = {}) => {
  const positions = createScanPath(options);

  if (positions.length === 0) {
    return { start: null, end: null };
  }

  return {
    start: positions[0],
    end: positions[positions.length - 1],
  };
};
