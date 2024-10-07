import fs from 'fs';
import {
  ensureArray,
  ensurePlainObject,
} from 'ensure-type';
import events from 'events';
import _map from 'lodash/map';
import x from './json-stringify';
import logger from './logger';

const log = logger('auto-leveling');

const gcode = (cmd, params) => {
  const s = _map(params, (value, letter) => String(letter + value)).join(' ');
  return (s.length > 0) ? (cmd + ' ' + s) : cmd;
};

const defaultState = Object.freeze({
  probePointCount: 0,
  probedPositions: [],
  minZ: 0,
  maxZ: 0,
});

class AutoLeveling extends events.EventEmitter {
  state = {
    ...defaultState,
  };

  eventHandler = {
    probeStart: () => {},
    probeUpdate: ({ pos }) => {
      if (this.state.probedPositions.length >= this.state.probePointCount) {
        return;
      }

      if (this.probedPoints.length === 0) {
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
      probePointCount: positions.length,
    });

    if (typeof callback === 'function') {
      callback(probeGCodes);
    }

    return probeGCodes;
  }

  stop() {
    this.resetState();
  }
}

export default AutoLeveling;
