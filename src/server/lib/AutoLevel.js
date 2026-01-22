import fs from 'fs';
import {
  ensureArray,
  ensurePlainObject,
} from 'ensure-type';
import events from 'events';
import * as gcodeParser from 'gcode-parser';
import _isNil from 'lodash/isNil';
import _map from 'lodash/map';
import _omitBy from 'lodash/omitBy';
import {
  IMPERIAL_UNITS,
  METRIC_UNITS,
} from '../controllers/constants';
import {
  mm2in,
  in2mm,
} from '../controllers/utils/units';
import x from './json-stringify';
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

const gcode = (cmd, params) => {
  params = _omitBy(params, _isNil); // Omit null or undefined values
  const s = _map(params, (value, letter) => String(letter + value)).join(' ');
  return (s.length > 0) ? (cmd + ' ' + s) : cmd;
};

const defaultState = Object.freeze({
  probePointCount: 0,
  probedPositions: [],
  minZ: 0,
  maxZ: 0,
});

class AutoLevel extends events.EventEmitter {
  state = {
    ...defaultState,
  };

  eventHandler = {
    probeStart: () => {},
    probeUpdate: ({ pos }) => {
      if (this.state.probedPositions.length >= this.state.probePointCount) {
        return;
      }

      if (this.state.probedPositions.length === 0) {
        this.setState({
          ...this.state,
          minZ: pos.z,
          maxZ: pos.z,
          probedPositions: this.state.probedPositions.concat(pos),
        });
      } else {
        this.setState({
          ...this.state,
          minZ: Math.min(this.state.minZ, pos.z),
          maxZ: Math.max(this.state.maxZ, pos.z),
          probedPositions: this.state.probedPositions.concat(pos),
        });
      }

      log.debug(`Probed ${this.state.probedPositions.length}/${this.state.probePointCount}: posX=${pos.x.toFixed(3)}, posY=${pos.y.toFixed(3)}, posZ=${pos.z.toFixed(3)}, minZ=${this.state.minZ.toFixed(3)}, maxZ=${this.state.maxZ.toFixed(3)})`);

      this.emit('probe_end');
    },
    probeEnd: () => {},
  };

  // @param {object} [options] The options object.
  constructor(options) {
    super();

    this.on('probe_start', this.eventHandler.probeStart);
    this.on('probe_update', this.eventHandler.probeUpdate);
    this.on('probe_end', this.eventHandler.probeEnd);
  }

  setState(nextState) {
    this.state = {
      ...nextState,
    };
  }

  resetState() {
    this.setState(defaultState);
  }

  getProbeXYPositions(options) {
    const {
      // x
      startX = 0, // x-axis minimum
      endX = 0, // x-asis maximum
      stepX = 10, // x-axis step size
      // y
      startY = 0, // y-axis minimum
      endY = 0, // y-axis maximum
      stepY = 10, // y-axis step size
    } = ensurePlainObject(options);

    const positions = [];

    for (let y = startY; y <= endY; y += stepY) {
      for (let x = startX; x <= endX; x += stepX) {
        positions.push({ x, y });
      }
    }

    return positions;
  }

  loadProbedPositionsFromFile(filepath) {
    try {
      const data = fs.readFileSync(filepath, 'utf8');
      const lines = data.split('\n')
        .filter(line => (line.trim().length > 0));

      const probedPositions = [];
      let minZ = Infinity;
      let maxZ = -Infinity;
      lines.forEach(line => {
        const regex = /(-?\d*\.?\d+)?(\s+|$)/g;
        const matches = [...line.matchAll(regex)];
        const values = matches.map(match => {
          return (match[1] ? Number(match[1]) : undefined);
        });
        const [x, y, z] = values;

        probedPositions.push({ x, y, z });

        minZ = Math.min(z, minZ);
        maxZ = Math.max(z, maxZ);
      });

      this.setState({
        ...this.state,
        probePointCount: lines.length,
        probedPositions,
        minZ,
        maxZ,
      });
    } catch (err) {
      log.error('Error loading probed positions from file:', err);
      return false;
    }

    log.debug(`Probed positions successfully loaded from ${x(filepath)}`);
    return true;
  }

  saveProbedPositionsToFile(filepath) {
    const { probedPositions } = this.state;

    // Convert probed positions to string lines
    const data = probedPositions.map(({ x, y, z }) => {
      const a = 0, b = 0, c = 0;
      const u = 0, v = 0, w = 0;
      return `${x} ${y} ${z} ${a} ${b} ${c} ${u} ${v} ${w}`;
    }).join('\n');

    try {
      fs.writeFileSync(filepath, data, 'utf8');
    } catch (err) {
      log.error('Error saving probed positions to file:', err);
      return false;
    }

    log.debug(`Probed positions successfully saved to ${x(filepath)}`);
    return true;
  }

  start(options, callback) {
    const {
      positions = [],
      feedrate,
      probeFeedrate = 20,
      startZ = 0,
      endZ = 0,
    } = ensurePlainObject(options);

    const probeGCodes = [];

    ensureArray(positions).forEach((position, index) => {
      const { x, y } = position;

      probeGCodes.push(
        gcode(`(Auto Leveling: probing point ${index})`),
      );

      // https://github.com/atmelino/cncjs/blob/autolevelwidget/src/app/widgets/AutoLevel/index.jsx
      if (index === 0) {
        probeGCodes.push(
          gcode('G90'), // Absolute positioning
          gcode('G0', {
            Z: startZ,
          }),
          gcode('G0', {
            X: x,
            Y: y,
            F: feedrate,
          }),
          gcode('G38.2', {
            Z: endZ,
            F: probeFeedrate / 2,
          }),
          gcode('G0', {
            Z: startZ,
          }),
        );
      } else {
        probeGCodes.push(
          gcode('G90'), // Absolute positioning
          gcode('G0', {
            X: x,
            Y: y,
            F: feedrate,
          }),
          gcode('G38.2', {
            Z: endZ,
            F: probeFeedrate,
          }),
          gcode('G0', {
            Z: startZ,
          }),
        );
      }
    });

    this.resetState();
    this.setState({
      ...this.state,
      probePointCount: positions.length,
    });

    // Emit probe_start event to signal the beginning of probing
    this.emit('probe_start', { positions });

    if (typeof callback === 'function') {
      callback(probeGCodes);
    }

    return probeGCodes;
  }

  stop() {
    this.resetState();
  }

  /**
   * Find three closest non-collinear probed points to a given point.
   * Used for planar interpolation of Z compensation.
   * @param {object} pt - Point with x, y coordinates (in mm)
   * @returns {array} Array of 3 closest non-collinear points, or empty if not enough points
   */
  #getThreeClosestPoints(pt) {
    const { probedPositions } = this.state;
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
  }

  /**
   * Calculate Z compensation for a point using planar interpolation.
   * @param {object} point - Point {x, y, z} in current units
   * @param {string} units - Current units (METRIC_UNITS or IMPERIAL_UNITS)
   * @returns {object} Compensated point {x, y, z}
   */
  #compensate(pt, units = METRIC_UNITS) {
    // Convert to mm for calculation (probed positions are in mm)
    const point = {
      x: units === IMPERIAL_UNITS ? in2mm(pt.x) : pt.x,
      y: units === IMPERIAL_UNITS ? in2mm(pt.y) : pt.y,
      z: units === IMPERIAL_UNITS ? in2mm(pt.z) : pt.z,
    };

    // Calculate plane from the 3 closest probed points:
    //
    //        planeNormal (perpendicular to plane)
    //           ↑
    //           |
    //           |
    //    -------+------- plane formed by 3 closest probed points
    //          /|\
    //         / | \
    //   point0  |  point2
    //           |
    //        point1
    //
    // - point0, point1, point2: The 3 closest non-collinear probed points that define a plane
    // - planeNormal: The cross product of two vectors on the plane, perpendicular to the surface
    // - planePoint: A reference point on the plane (point0) used for Z interpolation
    //
    const points = this.#getThreeClosestPoints(point);
    if (points.length < 3) {
      log.warn('Cannot find 3 closest points for Z compensation');
      return pt;
    }
    const planeNormal = crossProduct3(sub3(points[1], points[0]), sub3(points[2], points[0]));
    const planePoint = points[0];

    // Z Interpolation:
    // Using the plane equation with the normal vector, we can find the Z height at any XY position on that plane
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
  }

  /**
   * Apply Z compensation to loaded G-code.
   * @param {string} gcodeStr - G-code string to compensate
   * @param {object} options - Options
   * @param {number} options.stepX - Probe grid X step size in mm (for segment splitting)
   * @param {number} options.stepY - Probe grid Y step size in mm (for segment splitting)
   * @returns {string} Compensated G-code string
   */
  applyZCompensation(gcodeStr, options = {}) {
    const { probedPositions } = this.state;
    const {
      stepX = 10,
      stepY = 10,
    } = ensurePlainObject(options);

    if (probedPositions.length < 3) {
      log.error('Not enough probed positions for compensation (need at least 3)');
      return gcodeStr;
    }

    log.info('Applying Z compensation...');

    const lines = gcodeStr.split('\n');
    const result = [];

    let p0 = { x: 0, y: 0, z: 0 };
    let p0Initialized = false;
    let pt = { x: 0, y: 0, z: 0 };
    let isAbsolutePositioning = true; // Absolute positioning mode
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
        result.push(line.trim());
        return;
      }

      // Skip compensation for certain G-codes
      if (words.some(word => /^(G38.+|G5.+|G10|G4.+|G92|G92.1)$/i.test(word))) {
        result.push(strippedLine);
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
        result.push(strippedLine);
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
          for (const seg of segments) {
            const cpt = this.#compensate(seg, units);
            const newLine = `${lineWithoutXYZ} X${cpt.x.toFixed(3)} Y${cpt.y.toFixed(3)} Z${cpt.z.toFixed(3)}`;
            result.push(newLine.trim());
          }
        } else {
          // First point - just compensate without splitting
          const cpt = this.#compensate(pt, units);
          const newLine = `${lineWithoutXYZ} X${cpt.x.toFixed(3)} Y${cpt.y.toFixed(3)} Z${cpt.z.toFixed(3)}`;
          result.push(newLine.trim());
          p0Initialized = true;
        }
      } else {
        // Relative mode - copy as-is with warning
        result.push(strippedLine);
        log.warn('Relative positioning (G91) may not produce correct compensation results');
      }

      // Update previous position
      p0 = { x: pt.x, y: pt.y, z: pt.z };
    });

    log.info('Z compensation applied successfully');
    return result.join('\n');
  }
}

export default AutoLevel;
