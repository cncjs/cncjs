// Keep the browser's probe visit order in step with createProbeXYPoints() on
// the server. The server module also depends on the logger and G-code parser.
const FLOAT_EPSILON = 1e-10;

export const SCAN_PATTERNS = ['raster', 'zigzag', 'spiral-in', 'spiral-out'];
export const SCAN_DIRECTIONS = ['x', 'y'];

export const createAxisPositions = (start, end, step) => {
  if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(step) || step <= 0) {
    throw new RangeError('Axis start, end, and step must be finite, with step > 0');
  }
  if (end < start) {
    throw new RangeError('Axis end must be greater than or equal to start');
  }

  const count = Math.floor((end - start) / step + FLOAT_EPSILON);
  return Array.from({ length: count + 1 }, (_, index) => {
    const value = start + index * step;
    return Math.abs(value - end) <= FLOAT_EPSILON ? end : value;
  });
};

/** Return zero while an editable grid is invalid, otherwise count its points. */
export const getScanPointCount = ({ startX, endX, stepX, startY, endY, stepY }) => {
  if (![startX, endX, stepX, startY, endY, stepY].every(Number.isFinite) ||
      stepX <= 0 || stepY <= 0 || endX < startX || endY < startY) {
    return 0;
  }
  return createAxisPositions(startX, endX, stepX).length * createAxisPositions(startY, endY, stepY).length;
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
          positions.push({ x: xPositions[index], y });
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
        positions.push({ x, y: yPositions[index] });
      }
    }
  }
  return positions;
};

const createSpiralInPositions = ({ xPositions, yPositions, scanDirection }) => {
  if (xPositions.length === 0 || yPositions.length === 0) {
    return [];
  }
  const grid = yPositions.map(y => xPositions.map(x => ({ x, y })));
  const positions = [];
  let top = 0;
  let bottom = grid.length - 1;
  let left = 0;
  let right = grid[0].length - 1;

  while (top <= bottom && left <= right) {
    if (scanDirection === 'x') {
      for (let column = left; column <= right; column += 1) {
        positions.push(grid[top][column]);
      }
      top += 1;
      for (let row = top; row <= bottom; row += 1) {
        positions.push(grid[row][right]);
      }
      right -= 1;
      if (top <= bottom) {
        for (let column = right; column >= left; column -= 1) {
          positions.push(grid[bottom][column]);
        }
        bottom -= 1;
      }
      if (left <= right) {
        for (let row = bottom; row >= top; row -= 1) {
          positions.push(grid[row][left]);
        }
        left += 1;
      }
    } else {
      for (let row = top; row <= bottom; row += 1) {
        positions.push(grid[row][left]);
      }
      left += 1;
      for (let column = left; column <= right; column += 1) {
        positions.push(grid[bottom][column]);
      }
      bottom -= 1;
      if (left <= right) {
        for (let row = bottom; row >= top; row -= 1) {
          positions.push(grid[row][right]);
        }
        right -= 1;
      }
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

const createSpiralOutPositions = options => {
  const spiralInPositions = createSpiralInPositions(options);
  const positions = [];
  for (let index = spiralInPositions.length - 1; index >= 0; index -= 1) {
    positions.push(spiralInPositions[index]);
  }
  return positions;
};

/**
 * Build the probe visit order for a scan pattern and direction.
 * @param {object} options Grid bounds, steps, pattern, and direction.
 * @returns {{x: number, y: number}[]} Points in probe order.
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
 * Return the first and last points in probe order.
 * @param {object} options The same options as createScanPath.
 * @returns {{start: {x: number, y: number}|null, end: {x: number, y: number}|null}}
 */
export const getScanPathEndpoints = (options = {}) => {
  const positions = createScanPath(options);
  if (positions.length === 0) {
    return { start: null, end: null };
  }
  return { start: positions[0], end: positions[positions.length - 1] };
};
