import {
  ensureArray,
  ensurePlainObject,
} from 'ensure-type';
import events from 'events';

const DEFUALT_DELTA = 10.0; // step
const DEFAULT_FEED = 50; // probing feedrate
const DEFAULT_HEIGHT = 2; // travelling height

const gcode = (cmd, params) => {
  const s = map(params, (value, letter) => String(letter + value)).join(' ');
  return (s.length > 0) ? (cmd + ' ' + s) : cmd;
};

class AutoLeveling extends events.EventEmitter {
  state = {
    probePointCount: 0,
    probedPoints: [],
    min_dz: 0,
    max_dz: 0,
  };

  eventHandler = {
    probeStart: () => {},
    probeUpdate: ({ pos }) => {
      if (!this.state.probePointCount) {
        return;
      }

      if (this.probedPoints.length === 0) {
        this.state.min_dz = pos.z;
        this.state.max_dz = pos.z;
      } else {
        this.state.min_dz = Math.min(this.state.min_dz, pos.z);
        this.state.max_dz = Math.max(this.state.max_dz, pos.z);
      }
      this.state.probedPoints.push(pos);

      console.log('probed ' + this.state.probedPoints.length + '/' + this.state.probePointCount + '>', pos.x.toFixed(3), pos.y.toFixed(3), pos.z.toFixed(3));

      if (this.state.probedPoints.length >= this.state.probePointCount) {
        this.state.probePointCount = 0;

        console.log(`(AL: dz_min=${this.state.min_dz.toFixed(3)}, dz_max=${this.state.max_dz.toFixed(3)})`);

        this.emit('probe_end', { ...this.state });
      }
    },
    probeEnd: () => {},
  };

  _resetState() {
    this.state.probePointCount = 0;
    this.state.probedPoints = [];
    this.state.delta = DEFUALT_DELTA;
    this.state.feed = DEFAULT_FEED;
    this.state.height = DEFAULT_HEIGHT;
    this.state.min_dz = 0;
    this.state.max_dz = 0;
  }

  // @param {object} [options] The options object.
  constructor(options) {
    super();

    this._resetState();

    this.on('probe_start', this.eventHandler.probeStart);
    this.on('probe_update', this.eventHandler.probeUpdate);
    this.on('probe_end', this.eventHandler.probeEnd);
  }

  getProbeGridPositions() {
    const {
      // x
      startX = 0, // x-axis minimum
      endX= 0, // x-asis maximum
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

  load(probeData) {
    const lines = probeData.split('\n')
      .filter(line => (line.trim().length > 0));

    console.log(`Loading probed data: count={lines.length}`);
    const probedPoints = [];
    lines.forEach(line => {
      const values = line.split(' ');
      const x = parseFloat(values[0]);
      const y = parseFloat(values[1]);
      const z = parseFloat(values[2]);
      if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) {
        return;
      }
      const pt = { x, y, z };
      probedPoints.push(pt);
      console.log(`Probed point #${probedPoints.length}: x=${pt.x} y=${pt.y} z=${pt.z}`);
    });
    this.probedPoints = probedPoints;
  }

  start(options, callback) {
    const {
      positions = [],
      feedrate,
      probeDepth = 3,
      probeFeedrate = 20,
      safeHeight = 10,
    } = ensurePlainObject(options);
    this._resetState();

    const data = [];

    this.state.probePointCount = positions.length;

    for (let i = 0; i < positions.length; ++i) {
      const { x, y } = positions[i];

      // https://github.com/atmelino/cncjs/blob/autolevelwidget/src/app/widgets/AutoLevel/index.jsx
      if (i === 0) {
        data.push(
          gcode('(AutoLeveling: probing initial point)'),
          gcode('G90'),
          gcode('G0', {
            Z: safeHeight,
          }),
          gcode('G0', {
            X: x,
            Y: y,
            Z: safeHeight,
          }),
          gcode('G38.2', {
            Z: -probeDepth,
            F: probeFeedrate / 2,
          }),
          gcode('G0', {
            Z: safeHeight,
          }),
        );
        continue;
      }

      data.push(
        gcode('G90'),
        gcode('G0', {
          X: x,
          Y: y,
          F: feedrate,
        }),
        gcode('G38.2', {
          Z: -probeDepth,
          F: probeFeedrate,
        }),
        gcode('G0', {
          Z: safeHeight,
        }),
      );
    }

    if (typeof callback === 'function') {
      callback(data);
    }

    return data;
  }

  stop() {
    this._resetState();
  }
}

export default AutoLeveling;
