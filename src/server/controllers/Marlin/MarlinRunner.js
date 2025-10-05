import events from 'events';
import _ from 'lodash';
import MarlinLineParser from './MarlinLineParser';
import MarlinLineParserResultStart from './MarlinLineParserResultStart';
import MarlinLineParserResultFirmware from './MarlinLineParserResultFirmware';
import MarlinLineParserResultPosition from './MarlinLineParserResultPosition';
import MarlinLineParserResultOk from './MarlinLineParserResultOk';
import MarlinLineParserResultEcho from './MarlinLineParserResultEcho';
import MarlinLineParserResultError from './MarlinLineParserResultError';
import MarlinLineParserResultTemperature from './MarlinLineParserResultTemperature';

class MarlinRunner extends events.EventEmitter {
    state = {
      pos: {
        x: '0.000',
        y: '0.000',
        z: '0.000',
        e: '0.000'
      },
      modal: {
        motion: 'G0', // G0, G1, G2, G3, G38.2, G38.3, G38.4, G38.5, G80
        wcs: 'G54', // G54, G55, G56, G57, G58, G59
        plane: 'G17', // G17: xy-plane, G18: xz-plane, G19: yz-plane
        units: 'G21', // G20: Inches, G21: Millimeters
        distance: 'G90', // G90: Absolute, G91: Relative
        feedrate: 'G94', // G93: Inverse time mode, G94: Units per minute
        program: 'M0', // M0, M1, M2, M30
        spindle: 'M5', // M3: Spindle (cw), M4: Spindle (ccw), M5: Spindle off
        coolant: 'M9' // M7: Mist coolant, M8: Flood coolant, M9: Coolant off, [M7,M8]: Both on
      },
      ovF: 100,
      ovS: 100,
      extruder: {}, // { deg, degTarget, power }
      heatedBed: {}, // { deg, degTarget, power }
      hotend: {}, // { T0: { deg, degTarget, power }, T1: { deg, degTarget, power }, ... }
      rapidFeedrate: 0, // Related to G0
      feedrate: 0, // Related to G1, G2, G3, G38.2, G38.3, G38.4, G38.5, G80
      spindle: 0 // Related to M3, M4, M5
    };

    settings = {
    };

    parser = new MarlinLineParser();

    parse(data) {
      data = ('' + data).replace(/\s+$/, '');
      if (!data) {
        return;
      }

      this.emit('raw', { raw: data });

      const result = this.parser.parse(data) || {};
      const { type, payload } = result;

      if (type === MarlinLineParserResultStart) {
        this.emit('start', payload);
        return;
      }
      if (type === MarlinLineParserResultFirmware) {
        const {
          firmwareName,
          protocolVersion,
          machineType,
          extruderCount,
          uuid
        } = payload;
        const nextSettings = {
          ...this.settings,
          firmwareName,
          protocolVersion,
          machineType,
          extruderCount,
          uuid
        };
        if (!_.isEqual(this.settings, nextSettings)) {
          this.settings = nextSettings; // enforce change
        }

        this.emit('firmware', payload);
        return;
      }
      if (type === MarlinLineParserResultPosition) {
        const nextState = {
          ...this.state,
          pos: {
            ...this.state.pos,
            ...payload.pos
          }
        };

        if (!_.isEqual(this.state.pos, nextState.pos)) {
          this.state = nextState; // enforce change
        }
        this.emit('pos', payload);
        return;
      }
      if (type === MarlinLineParserResultOk) {
        this.emit('ok', payload);
        return;
      }
      if (type === MarlinLineParserResultError) {
        this.emit('error', payload);
        return;
      }
      if (type === MarlinLineParserResultEcho) {
        this.emit('echo', payload);
        return;
      }
      if (type === MarlinLineParserResultTemperature) {
        const nextState = {
          ...this.state,
          extruder: {
            ...this.state.extruder,
            ...payload.extruder,
          },
          heatedBed: {
            ...this.state.heatedBed,
            ...payload.heatedBed,
          },
          hotend: {
            ...this.state.hotend,
            ...payload.hotend,
          },
        };

        if (!_.isEqual(this.state.extruder, nextState.extruder) ||
                !_.isEqual(this.state.heatedBed, nextState.heatedBed) ||
                !_.isEqual(this.state.hotend, nextState.hotend)) {
          this.state = nextState; // enforce change
        }

        // The 'ok' event (w/ empty response) should follow the 'temperature' event
        this.emit('temperature', payload);

        // > M105
        // < ok T:27.0 /0.0 B:26.8 /0.0 B@:0 @:0
        if (payload.ok) {
          // Emit an 'ok' event with empty response
          this.emit('ok');
        }

        return;
      }
      if (data.length > 0) {
        this.emit('others', payload);
        return;
      }
    }

    getMachinePosition(state = this.state) {
      return _.get(state, 'pos', {});
    }

    getWorkPosition(state = this.state) {
      return _.get(state, 'pos', {});
    }

    getModalGroup(state = this.state) {
      return _.get(state, 'modal', {});
    }

    getWorkCoordinateSystem(state = this.state) {
      const defaultWCS = 'G54';
      return _.get(state, 'modal.wcs', defaultWCS);
    }

    getTool(state = this.state) {
      // Not supported
      return 0;
    }

    isAlarm() {
      // Not supported
      return false;
    }

    isIdle() {
      // Not supported
      return false;
    }
}

export default MarlinRunner;
