import {
  ensurePlainObject,
} from 'ensure-type';
import * as gcodeParser from 'gcode-parser';
import {
  IMPERIAL_UNITS,
  METRIC_UNITS,
} from '../controllers/constants';
import {
  mm2in,
  in2mm,
} from '../controllers/utils/units';
import logger from './logger';

const log = logger('autolevel');

/**
 * @typedef {object} Point3
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 * @property {number} z - Z coordinate
 */

/**
 * @typedef {object} ProbeGrid
 * @property {number[]} xs - Sorted unique X grid coordinates
 * @property {number[]} ys - Sorted unique Y grid coordinates
 * @property {number[][]} matrix - Heights; matrix[j][i] is the height at (xs[i], ys[j])
 */

// Default probe-grid spacing (mm) when the data isn't a usable rectangular grid.
const DEFAULT_GRID_STEP = 5;

// Vector subtraction: p1 - p2
const sub3 = (p1, p2) => ({
  x: p1.x - p2.x,
  y: p1.y - p2.y,
  z: p1.z - p2.z,
});

// 2D distance squared (ignores Z)
const distanceSquared2 = (p1, p2) => {
  return (p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y);
};

// 3D distance squared
const distanceSquared3 = (p1, p2) => {
  return (p2.x - p1.x) * (p2.x - p1.x) +
         (p2.y - p1.y) * (p2.y - p1.y) +
         (p2.z - p1.z) * (p2.z - p1.z);
};

// Cross product of two 3D vectors
const crossProduct3 = (u, v) => ({
  x: (u.y * v.z - u.z * v.y),
  y: -(u.x * v.z - u.z * v.x),
  z: (u.x * v.y - u.y * v.x),
});

// Check if two 2D vectors are colinear
const isColinear = (u, v) => {
  return Math.abs(u.x * v.y - u.y * v.x) < 0.00001;
};

/**
 * Subdivide a segment into smaller subsegments for Z compensation.
 *
 * Why subdivision is needed:
 * Without splitting, a long diagonal move from point A to B would only get
 * Z compensation at the endpoints. But the surface may vary along the path.
 *
 * Without splitting:          With splitting:
 * A ─────────────── B         A ── • ── • ── • ── B
 * (Z adjusted at A,B only)    (Z adjusted at each point)
 *
 * Example:
 * - Move from (0,0) to (50,50) with maxSegmentLength = 10mm
 * - Creates ~7 intermediate points along the path
 * - Each point gets Z compensation interpolated from the probe surface
 * - Results in a toolpath that follows the actual surface contour
 *
 * @param {Point3} p1 - Start point
 * @param {Point3} p2 - End point
 * @param {number} maxSegmentLength - Maximum length between subdivided points
 * @returns {Point3[]} Points from p1 to p2, including both endpoints
 */
const subdivideSegment = (p1, p2, maxSegmentLength) => {
  const result = [];
  const v = sub3(p2, p1);
  const dist = Math.sqrt(distanceSquared3(p1, p2));

  if (dist < 1e-10) {
    return [];
  }

  // Direction vector
  const dir = {
    x: v.x / dist,
    y: v.y / dist,
    z: v.z / dist,
  };

  // First point
  result.push({ x: p1.x, y: p1.y, z: p1.z });

  // Intermediate points
  for (let d = maxSegmentLength; d < dist; d += maxSegmentLength) {
    const pt = {
      x: p1.x + dir.x * d,
      y: p1.y + dir.y * d,
      z: p1.z + dir.z * d,
    };
    // Skip duplicate points
    if (result.length === 0 || distanceSquared3(pt, result[result.length - 1]) > 1e-10) {
      result.push(pt);
    }
  }

  // Last point
  if (result.length === 0 || distanceSquared3(p2, result[result.length - 1]) > 1e-10) {
    result.push({ x: p2.x, y: p2.y, z: p2.z });
  }

  return result;
};

/**
 * Find three closest non-collinear probed points to a given point.
 * Used as a fallback for non-grid data (see planeFitZ).
 * @param {object} pt - Query point in mm
 * @param {number} pt.x - X coordinate
 * @param {number} pt.y - Y coordinate
 * @param {Point3[]} probedPositions - Probed positions in mm
 * @returns {Point3[]} The 3 closest non-collinear points, or empty if not enough points
 */
const getThreeClosestPoints = (pt, probedPositions) => {
  const result = [];

  if (probedPositions.length < 3) {
    return result;
  }

  // Sort by 2D distance to target point
  const sorted = [...probedPositions].sort((a, b) => {
    return distanceSquared2(a, pt) - distanceSquared2(b, pt);
  });

  let i = 0;
  while (result.length < 3 && i < sorted.length) {
    if (result.length === 2) {
      // Make sure the third point is not collinear with the first two
      if (!isColinear(sub3(result[1], result[0]), sub3(sorted[i], result[0]))) {
        result.push(sorted[i]);
      }
    } else {
      result.push(sorted[i]);
    }
    i++;
  }

  return result;
};

/**
 * Interpolate the probe-surface Z at (x, y) by fitting a plane through the three
 * closest non-collinear probed points. Used as a fallback when the probe data is
 * not a complete rectangular grid.
 * @param {number} x - X in mm
 * @param {number} y - Y in mm
 * @param {Point3[]} probedPositions - Probed positions in mm
 * @returns {number|null} Surface Z in mm, or null if it cannot be computed
 */
const planeFitZ = (x, y, probedPositions) => {
  const points = getThreeClosestPoints({ x, y }, probedPositions);
  if (points.length < 3) {
    return null;
  }
  const normal = crossProduct3(sub3(points[1], points[0]), sub3(points[2], points[0]));
  if (normal.z === 0) {
    return null;
  }
  const base = points[0];
  return base.z - (normal.x * (x - base.x) + normal.y * (y - base.y)) / normal.z;
};

/**
 * Build a lattice for bilinear interpolation from probed points.
 * @param {Point3[]} probedPositions - Probed positions in mm
 * @returns {ProbeGrid|null} Grid (see ProbeGrid typedef); matrix[j][i] is
 *   undefined for an unprobed node. null when there are fewer than two distinct
 *   X or Y values.
 */
const buildProbeGrid = (probedPositions) => {
  const round = (v) => Math.round(v * 1000) / 1000; // 1 micron tolerance
  const xs = [...new Set(probedPositions.map(p => round(p.x)))].sort((a, b) => a - b);
  const ys = [...new Set(probedPositions.map(p => round(p.y)))].sort((a, b) => a - b);
  if (xs.length < 2 || ys.length < 2) {
    return null;
  }
  const xIndex = new Map(xs.map((x, i) => [x, i]));
  const yIndex = new Map(ys.map((y, j) => [y, j]));
  const matrix = ys.map(() => new Array(xs.length).fill(undefined));
  for (const p of probedPositions) {
    matrix[yIndex.get(round(p.y))][xIndex.get(round(p.x))] = p.z;
  }
  return { xs, ys, matrix };
};

// Largest cell index i with values[i] <= v, clamped to a valid cell [0, n-2] so
// points outside the grid extrapolate from the nearest edge cell.
const findCell = (values, v) => {
  let i = 0;
  while ((i < values.length - 2) && (values[i + 1] <= v)) {
    i += 1;
  }
  return i;
};

// Smallest gap between consecutive sorted grid coordinates (assumes >= 2 values).
const minSpacing = (sorted) => {
  let min = Infinity;
  for (let k = 1; k < sorted.length; k += 1) {
    const gap = sorted[k] - sorted[k - 1];
    if (gap > 0 && gap < min) {
      min = gap;
    }
  }
  return min;
};

/**
 * Bilinear interpolation of the probe-surface Z at (x, y) over the grid.
 * @param {ProbeGrid} grid - Grid from buildProbeGrid (mm)
 * @param {number} x - X in mm
 * @param {number} y - Y in mm
 * @returns {number|null} Surface Z in mm, or null if any of the four surrounding
 *   grid nodes is missing (caller falls back to plane fit)
 */
const bilinearZ = (grid, x, y) => {
  const { xs, ys, matrix } = grid;
  const i = findCell(xs, x);
  const j = findCell(ys, y);
  const z00 = matrix[j][i];
  const z10 = matrix[j][i + 1];
  const z01 = matrix[j + 1][i];
  const z11 = matrix[j + 1][i + 1];
  if (z00 === undefined || z10 === undefined || z01 === undefined || z11 === undefined) {
    return null;
  }
  const a = (x - xs[i]) / (xs[i + 1] - xs[i]);
  const b = (y - ys[j]) / (ys[j + 1] - ys[j]);
  return z00 * (1 - a) * (1 - b) +
    z10 * a * (1 - b) +
    z01 * (1 - a) * b +
    z11 * a * b;
};

/**
 * Build a queryable probe surface. zAt(x, y) returns the surface Z (mm) at a
 * point (mm), using bilinear interpolation over the grid and falling back to a
 * 3-point plane fit for non-grid data or grid cells with missing nodes.
 * @param {Point3[]} probedPositions - Probed positions in mm
 * @returns {{ zAt: (x: number, y: number) => (number|null), stepX: number, stepY: number }}
 */
const buildSurface = (probedPositions) => {
  // Bilinear interpolation lattice; null when the probe data has fewer than two
  // distinct X or Y values (per-cell plane-fit fallback handles sparse grids).
  const grid = buildProbeGrid(probedPositions);

  // Grid spacing controls how finely moves are subdivided; derive it from the
  // probe lattice instead of rescanning every point pair.
  const stepX = grid ? minSpacing(grid.xs) : DEFAULT_GRID_STEP;
  const stepY = grid ? minSpacing(grid.ys) : DEFAULT_GRID_STEP;

  const zAt = (x, y) => {
    const z = grid ? bilinearZ(grid, x, y) : null;
    return z !== null ? z : planeFitZ(x, y, probedPositions);
  };

  return { zAt, stepX, stepY };
};

/**
 * Calculate Z compensation for a point. Uses bilinear interpolation over the
 * probe grid, falling back to a 3-point plane fit for non-grid data or grid
 * cells with missing nodes.
 * @param {Point3} pt - Point in current units
 * @param {object} surface - Probe surface from buildSurface
 * @param {string} units - Current units (METRIC_UNITS or IMPERIAL_UNITS)
 * @returns {Point3} Compensated point in current units
 */
const compensatePoint = (pt, surface, units = METRIC_UNITS) => {
  // Probed positions are in mm; convert the query point to match.
  const x = units === IMPERIAL_UNITS ? in2mm(pt.x) : pt.x;
  const y = units === IMPERIAL_UNITS ? in2mm(pt.y) : pt.y;
  const z = units === IMPERIAL_UNITS ? in2mm(pt.z) : pt.z;

  const dz = surface.zAt(x, y);
  if (dz === null) {
    log.warn('Cannot compute Z compensation for point');
    return pt;
  }

  const compensatedZ = z + dz;
  return {
    x: pt.x,
    y: pt.y,
    z: units === IMPERIAL_UNITS ? mm2in(compensatedZ) : compensatedZ,
  };
};

/**
 * Creates probe XY points based on the given range and step configuration.
 *
 * @param {object} options - Configuration options
 * @param {number} options.startX - X-axis minimum
 * @param {number} options.endX - X-axis maximum
 * @param {number} options.stepX - X-axis step size
 * @param {number} options.startY - Y-axis minimum
 * @param {number} options.endY - Y-axis maximum
 * @param {number} options.stepY - Y-axis step size
 * @returns {array} Array of probe XY points [{x, y}, ...]
 */
export const createProbeXYPoints = (options) => {
  const {
    startX = 0,
    endX = 0,
    stepX = 10,
    startY = 0,
    endY = 0,
    stepY = 10,
  } = ensurePlainObject(options);

  const positions = [];

  for (let y = startY; y <= endY; y += stepY) {
    for (let x = startX; x <= endX; x += stepX) {
      positions.push({ x, y });
    }
  }

  return positions;
};

/**
 * Applies probe-based compensation to G-code to correct positional deviations.
 * Grid step size is automatically detected from probe data spacing.
 *
 * @param {string} gcodeStr - G-code string to compensate
 * @param {array} probeData - Array of probe data [{x, y, z, a, b, c, u, v, w}, ...] or [{x, y, z}, ...]
 * @returns {string} Compensated G-code string
 */
export const applyProbeCompensation = (gcodeStr, probeData = []) => {
  // Extract just x, y, z from probe data
  const probedPositions = probeData.map(p => ({
    x: Number(p.x),
    y: Number(p.y),
    z: Number(p.z),
  }));

  if (probedPositions.length < 3) {
    log.error('Not enough probed positions for compensation (need at least 3)');
    return gcodeStr;
  }

  const surface = buildSurface(probedPositions);
  const { stepX, stepY } = surface;

  log.info(`Applying Z compensation (auto-detected grid: ${stepX.toFixed(2)}mm × ${stepY.toFixed(2)}mm, ${probedPositions.length} points)...`);

  const lines = gcodeStr.split('\n');
  const results = [];

  let p0 = { x: 0, y: 0, z: 0 };
  let p0Initialized = false;
  let pt = { x: 0, y: 0, z: 0 };
  let isAbsolutePositioning = true;
  let units = METRIC_UNITS;

  lines.forEach((line, lineIndex) => {
    // Progress logging
    if (lineIndex % 1000 === 0) {
      log.debug(`Compensation progress: ${lineIndex}/${lines.length}`);
    }

    // Parse line using gcode-parser
    const { line: strippedLine, words } = gcodeParser.parseLine(line, {
      flatten: true,
      lineMode: 'stripped',
    });

    // If empty line or only comments, copy original line as-is
    if (!strippedLine || words.length === 0) {
      results.push(line);
      return;
    }

    // Skip compensation for certain G-codes
    if (words.some(word => /^(G38.+|G5.+|G10|G4.+|G92|G92.1)$/i.test(word))) {
      results.push(line);
      return;
    }

    // Track positioning mode
    if (words.includes('G91')) {
      isAbsolutePositioning = false;
    }
    if (words.includes('G90')) {
      isAbsolutePositioning = true;
    }

    // Track units
    if (words.includes('G20')) {
      units = IMPERIAL_UNITS;
    }
    if (words.includes('G21')) {
      units = METRIC_UNITS;
    }

    // Extract coordinate values from words (single pass)
    const coordinate = (() => {
      const result = { x: undefined, y: undefined, z: undefined };
      for (const word of words) {
        const letter = word[0].toUpperCase();
        if (letter === 'X' || letter === 'Y' || letter === 'Z') {
          result[letter.toLowerCase()] = parseFloat(word.substring(1));
        }
      }
      return result;
    })();

    // If no coordinate change, copy line as-is
    if ((coordinate.x === undefined) && (coordinate.y === undefined) && (coordinate.z === undefined)) {
      results.push(line);
      return;
    }

    // Update coordinates
    if (coordinate.x !== undefined) {
      pt.x = coordinate.x;
    }
    if (coordinate.y !== undefined) {
      pt.y = coordinate.y;
    }
    if (coordinate.z !== undefined) {
      pt.z = coordinate.z;
    }

    if (isAbsolutePositioning) {
      // Build line without XYZ coordinates
      const lineWithoutXYZ = words
        .filter(word => {
          const letter = word[0].toUpperCase();
          return (letter !== 'X' && letter !== 'Y' && letter !== 'Z');
        })
        .join(' ');

      // Calculate max segment length based on step size and units
      //
      // Approach | Formula                    | Use Case
      // :------- | :------------------------- | :------------------------------------------
      // Min      | Math.min(stepX, stepY)     | Conservative - captures detail in both axes
      // Max      | Math.max(stepX, stepY)     | Faster - fewer segments
      // Average  | (stepX + stepY) / 2        | Balanced
      // Diagonal | Math.sqrt(stepX² + stepY²) | Grid cell diagonal
      //
      // Using Math.min(stepX, stepY) ensures the segment length is small enough to capture surface variations in both directions.
      // If stepX = 5mm and stepY = 20mm, using min (5mm) prevents missing detail along the finer X grid.
      const step = Math.min(stepX, stepY);
      const maxSegmentLength = (units === IMPERIAL_UNITS ? mm2in(step) : step) / 2;

      if (p0Initialized) {
        // Split into segments and compensate each
        const segments = subdivideSegment(p0, pt, maxSegmentLength);
        // Skip first segment (it's p0, already output in previous command)
        for (let i = 1; i < segments.length; i++) {
          const seg = segments[i];
          const cpt = compensatePoint(seg, surface, units);
          const newLine = `${lineWithoutXYZ} X${cpt.x.toFixed(3)} Y${cpt.y.toFixed(3)} Z${cpt.z.toFixed(3)}`;
          results.push(newLine.trim());
        }
      } else {
        // First point - just compensate without splitting
        const cpt = compensatePoint(pt, surface, units);
        const newLine = `${lineWithoutXYZ} X${cpt.x.toFixed(3)} Y${cpt.y.toFixed(3)} Z${cpt.z.toFixed(3)}`;
        results.push(newLine.trim());
        p0Initialized = true;
      }
    } else {
      // Relative mode - copy as-is with warning
      results.push(line);
      log.warn('Relative positioning (G91) may not produce correct compensation results');
    }

    // Update previous position
    p0 = { x: pt.x, y: pt.y, z: pt.z };
  });

  log.info('Z compensation applied successfully');
  return results.join('\n');
};
