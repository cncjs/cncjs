import events from 'events';
import _ from 'lodash';
import SmoothieLineParser from './SmoothieLineParser';
import SmoothieLineParserResultStatus from './SmoothieLineParserResultStatus';
import SmoothieLineParserResultOk from './SmoothieLineParserResultOk';
import SmoothieLineParserResultError from './SmoothieLineParserResultError';
import SmoothieLineParserResultAction from './SmoothieLineParserResultAction';
import SmoothieLineParserResultAlarm from './SmoothieLineParserResultAlarm';
import SmoothieLineParserResultParserState from './SmoothieLineParserResultParserState';
import SmoothieLineParserResultParameters from './SmoothieLineParserResultParameters';
import SmoothieLineParserResultVersion from './SmoothieLineParserResultVersion';
import {
  SMOOTHIE_ACTIVE_STATE_IDLE,
  SMOOTHIE_ACTIVE_STATE_ALARM
} from './constants';

class SmoothieRunner extends events.EventEmitter {
    state = {
      status: {
        activeState: '',
        mpos: {
          x: '0.0000',
          y: '0.0000',
          z: '0.0000'
        },
        wpos: {
          x: '0.0000',
          y: '0.0000',
          z: '0.0000'
        },
      },
      parserstate: {
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
        tool: '',
        feedrate: '',
        spindle: ''
      }
    };

    settings = {
      build: {
        version: '',
        date: ''
      },
      hardware: {
        mcu: '',
        sysclk: ''
      },
      parameters: {
      }
    };

    parser = new SmoothieLineParser();

    parse(data) {
      data = ('' + data).replace(/\s+$/, '');
      if (!data) {
        return;
      }

      this.emit('raw', { raw: data });

      const result = this.parser.parse(data) || {};
      const { type, payload } = result;

      if (type === SmoothieLineParserResultStatus) {
        const nextState = {
          ...this.state,
          status: {
            ...payload
          }
        };

        // Delete the raw key
        delete nextState.status.raw;

        if (!_.isEqual(this.state.status, nextState.status)) {
          this.state = nextState; // enforce change
        }
        this.emit('status', payload);
        return;
      }
      if (type === SmoothieLineParserResultOk) {
        this.emit('ok', payload);
        return;
      }
      if (type === SmoothieLineParserResultError) {
        // https://nodejs.org/api/events.html#events_error_events
        // As a best practice, listeners should always be added for the 'error' events.
        this.emit('error', payload);
        return;
      }
      if (type === SmoothieLineParserResultAction) {
        this.emit('action', payload);
        return;
      }
      if (type === SmoothieLineParserResultAlarm) {
        this.emit('alarm', payload);
        return;
      }
      if (type === SmoothieLineParserResultParserState) {
        const { modal, tool, feedrate, spindle } = payload;
        const nextState = {
          ...this.state,
          parserstate: {
            modal: modal,
            tool: tool,
            feedrate: feedrate,
            spindle: spindle
          }
        };
        if (!_.isEqual(this.state.parserstate, nextState.parserstate)) {
          this.state = nextState; // enforce change
        }
        this.emit('parserstate', payload);
        return;
      }
      if (type === SmoothieLineParserResultParameters) {
        const { name, value } = payload;
        const nextSettings = {
          ...this.settings,
          parameters: {
            ...this.settings.parameters,
            [name]: value
          }
        };
        if (!_.isEqual(this.settings.parameters[name], nextSettings.parameters[name])) {
          this.settings = nextSettings; // enforce change
        }
        this.emit('parameters', payload);
        return;
      }
      if (type === SmoothieLineParserResultVersion) {
        const { build, mcu, sysclk } = payload;
        this.settings = { // enforce change
          ...this.settings,
          build: {
            ...this.settings.build,
            ...build
          },
          hardware: {
            ...this.settings.hardware,
            mcu,
            sysclk
          }
        };
        this.emit('version', payload);
        return;
      }
      if (data.length > 0) {
        this.emit('others', payload);
        return;
      }
    }

    getMachinePosition(state = this.state) {
      return _.get(state, 'status.mpos', {});
    }

    getWorkPosition(state = this.state) {
      return _.get(state, 'status.wpos', {});
    }

    getModalGroup(state = this.state) {
      return _.get(state, 'parserstate.modal', {});
    }

    getWorkCoodinateSystem(state = this.state) {
      const defaultWCS = 'G54';
      return _.get(state, 'parserstate.modal.wcs', defaultWCS);
    }

    getTool(state = this.state) {
      return Number(_.get(state, 'parserstate.tool')) || 0;
    }

    isAlarm() {
      const activeState = _.get(this.state, 'status.activeState');
      return activeState === SMOOTHIE_ACTIVE_STATE_ALARM;
    }

    isIdle() {
      const activeState = _.get(this.state, 'status.activeState');
      return activeState === SMOOTHIE_ACTIVE_STATE_IDLE;
    }
}

export default SmoothieRunner;
