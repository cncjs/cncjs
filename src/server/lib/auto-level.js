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

const log = logger('AutoLevel');

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
 * - Each point gets Z compensation from the 3 closest probed points
 * - Results in a toolpath that follows the actual surface contour
 *
 * @param {object} p1 - Start point {x, y, z}
 * @param {object} p2 - End point {x, y, z}
 * @param {number} maxSegmentLength - Maximum length between subdivided points
 * @returns {array} Array of points from p1 to p2, including both endpoints
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
 * Used for planar interpolation of Z compensation.
 * @param {object} pt - Point with x, y coordinates (in mm)
 * @param {array} probedPositions - Array of probed positions
 * @returns {array} Array of 3 closest non-collinear points, or empty if not enough points
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
 * Calculate Z compensation for a point using planar interpolation.
 * @param {object} pt - Point {x, y, z} in current units
 * @param {array} probedPositions - Array of probed positions in mm
 * @param {string} units - Current units (METRIC_UNITS or IMPERIAL_UNITS)
 * @returns {object} Compensated point {x, y, z}
 */
const compensatePoint = (pt, probedPositions, units = METRIC_UNITS) => {
  // Convert to mm for calculation (probed positions are in mm)
  const point = {
    x: units === IMPERIAL_UNITS ? in2mm(pt.x) : pt.x,
    y: units === IMPERIAL_UNITS ? in2mm(pt.y) : pt.y,
    z: units === IMPERIAL_UNITS ? in2mm(pt.z) : pt.z,
  };

  // Calculate plane from the 3 closest probed points
  const points = getThreeClosestPoints(point, probedPositions);
  if (points.length < 3) {
    log.warn('Cannot find 3 closest points for Z compensation');
    return pt;
  }
  const planeNormal = crossProduct3(sub3(points[1], points[0]), sub3(points[2], points[0]));
  const planePoint = points[0];

  // Z Interpolation
  let dz = 0;
  if (planeNormal.z !== 0) {
    dz = planePoint.z - (planeNormal.x * (point.x - planePoint.x) + planeNormal.y * (point.y - planePoint.y)) / planeNormal.z;
  } else {
    log.warn('Plane normal Z is zero, cannot interpolate');
  }
  const compensatedZ = point.z + dz;

  // Convert back to original units
  return {
    x: pt.x,
    y: pt.y,
    z: units === IMPERIAL_UNITS ? mm2in(compensatedZ) : compensatedZ,
  };
};

/**
 * Generates probe positions based on the given range and step configuration.
 *
 * @param {object} options - Configuration options
 * @param {number} options.startX - X-axis minimum
 * @param {number} options.endX - X-axis maximum
 * @param {number} options.stepX - X-axis step size
 * @param {number} options.startY - Y-axis minimum
 * @param {number} options.endY - Y-axis maximum
 * @param {number} options.stepY - Y-axis step size
 * @returns {array} Array of probe positions [{x, y}, ...]
 */
export const generateProbePositions = (options) => {
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

  // Auto-detect grid step size from probe data
  let minXStep = Infinity;
  let minYStep = Infinity;

  for (let i = 0; i < probedPositions.length; i++) {
    for (let j = i + 1; j < probedPositions.length; j++) {
      const dx = Math.abs(probedPositions[j].x - probedPositions[i].x);
      const dy = Math.abs(probedPositions[j].y - probedPositions[i].y);

      // Track minimum non-zero distances
      if (dx > 0.001 && dx < minXStep) {
        minXStep = dx;
      }
      if (dy > 0.001 && dy < minYStep) {
        minYStep = dy;
      }
    }
  }

  const stepX = (minXStep !== Infinity) ? minXStep : 10;
  const stepY = (minYStep !== Infinity) ? minYStep : 10;

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
      // Using Math.min(stepX, stepY) ensures the segment length is small enough to capture surface variationsin both directions.
      // If stepX = 5mm and stepY = 20mm, using min (5mm) prevents missing detail along the finer X grid.
      const step = Math.min(stepX, stepY);
      const maxSegmentLength = (units === IMPERIAL_UNITS ? mm2in(step) : step) / 2;

      if (p0Initialized) {
        // Split into segments and compensate each
        const segments = subdivideSegment(p0, pt, maxSegmentLength);
        // Skip first segment (it's p0, already output in previous command)
        for (let i = 1; i < segments.length; i++) {
          const seg = segments[i];
          const cpt = compensatePoint(seg, probedPositions, units);
          const newLine = `${lineWithoutXYZ} X${cpt.x.toFixed(3)} Y${cpt.y.toFixed(3)} Z${cpt.z.toFixed(3)}`;
          results.push(newLine.trim());
        }
      } else {
        // First point - just compensate without splitting
        const cpt = compensatePoint(pt, probedPositions, units);
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
