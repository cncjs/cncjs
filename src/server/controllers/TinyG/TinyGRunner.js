import events from 'events';
import { ensureArray } from 'ensure-type';
import _ from 'lodash';
import TinyGLineParser from './TinyGLineParser';
import TinyGLineParserResultMotorTimeout from './TinyGLineParserResultMotorTimeout';
import TinyGLineParserResultOverrides from './TinyGLineParserResultOverrides';
import TinyGLineParserResultPowerManagement from './TinyGLineParserResultPowerManagement';
import TinyGLineParserResultQueueReports from './TinyGLineParserResultQueueReports';
import TinyGLineParserResultReceiveReports from './TinyGLineParserResultReceiveReports';
import TinyGLineParserResultStatusReports from './TinyGLineParserResultStatusReports';
import TinyGLineParserResultSystemSettings from './TinyGLineParserResultSystemSettings';
import {
  TINYG_MACHINE_STATE_READY,
  TINYG_MACHINE_STATE_ALARM,
  TINYG_MACHINE_STATE_STOP,
  TINYG_MACHINE_STATE_END,

  // G-code Motion Mode
  TINYG_GCODE_MOTION_G0,
  TINYG_GCODE_MOTION_G1,
  TINYG_GCODE_MOTION_G2,
  TINYG_GCODE_MOTION_G3,
  TINYG_GCODE_MOTION_G80,

  // G-code Coordinate System
  TINYG_GCODE_COORDINATE_G53,
  TINYG_GCODE_COORDINATE_G54,
  TINYG_GCODE_COORDINATE_G55,
  TINYG_GCODE_COORDINATE_G56,
  TINYG_GCODE_COORDINATE_G57,
  TINYG_GCODE_COORDINATE_G58,
  TINYG_GCODE_COORDINATE_G59,

  // G-code Plane Selection
  TINYG_GCODE_PLANE_G17,
  TINYG_GCODE_PLANE_G18,
  TINYG_GCODE_PLANE_G19,

  // G-code Units
  TINYG_GCODE_UNITS_G20,
  TINYG_GCODE_UNITS_G21,

  // G-code Distance Mode
  TINYG_GCODE_DISTANCE_G90,
  TINYG_GCODE_DISTANCE_G91,

  // G-code Feedrate Mode
  TINYG_GCODE_FEEDRATE_G93,
  TINYG_GCODE_FEEDRATE_G94,
  TINYG_GCODE_FEEDRATE_G95,

  // G-code Path Control Mode
  TINYG_GCODE_PATH_G61,
  TINYG_GCODE_PATH_G61_1,
  TINYG_GCODE_PATH_G64
} from './constants';

class TinyGRunner extends events.EventEmitter {
    state = {
      // Motor Timeout
      mt: 0,
      // Power Management
      pwr: {
        // {"1":0,"2":0,"3":0,"4":0}
      },
      // Queue Reports
      qr: 0,
      // Status Reports
      sr: {
        machineState: '',
        velocity: 0,
        line: 0,
        feedrate: 0,
        mpos: {
          x: '0.000',
          y: '0.000',
          z: '0.000'
        },
        wpos: {
          x: '0.000',
          y: '0.000',
          z: '0.000'
        },
        modal: {
          motion: '', // G0, G1, G2, G3, G38.2, G38.3, G38.4, G38.5, G80
          wcs: '', // G54, G55, G56, G57, G58, G59
          plane: '', // G17: xy-plane, G18: xz-plane, G19: yz-plane
          units: '', // G20: Inches, G21: Millimeters
          distance: '', // G90: Absolute, G91: Relative
          feedrate: '', // G93: Inverse time mode, G94: Units per minute
          path: '', // G61: Exact path mode, G61.1: Exact stop mode, G64: Continuous mode
          spindle: '', // M3: Spindle (cw), M4: Spindle (ccw), M5: Spindle off
          coolant: '' // M7: Mist coolant, M8: Flood coolant, M9: Coolant off, [M7,M8]: Both on
        },
        tool: 0,
        tlo: { // tool length offset
          x: 0,
          y: 0,
          z: 0,
        },
        // spindle
        spe: 0, // [edge-082.10] Spindle enable
        spd: 0, // [edge-082.10] Spindle direction
        spc: 0, // [edge-101.03] Spindle control
        sps: 0, // [edge-082.10] Spindle speed
      }
    };

    settings = {
      // Identification Parameters
      // https://github.com/synthetos/g2/wiki/Configuring-0.99-System-Groups#identification-parameters
      fb: 0, // firmware build
      fbs: '', // firmware build string
      fbc: '', // firmware build config
      fv: 0, // firmware version
      hp: 0, // hardware platform: 1=Xmega, 2=Due, 3=v9(ARM)
      hv: 0, // hardware version
      id: '', // board ID

      mfo: 1, // manual feedrate override
      mto: 1, // manual traverse override
      sso: 1 // spindle speed override
    };

    footer = {
      revision: 0,
      statusCode: 0, // https://github.com/synthetos/g2/wiki/Status-Codes
      rxBufferInfo: 0
    };

    plannerBufferPoolSize = 0; // Suggest 12 min. Limit is 255

    parser = new TinyGLineParser();

    parse(data) {
      data = ('' + data).replace(/\s+$/, '');
      if (!data) {
        return;
      }

      this.emit('raw', { raw: data });

      if (data.match(/^{/)) {
        try {
          data = JSON.parse(data);
        } catch (err) {
          data = {};
        }

        const result = this.parser.parse(data) || {};
        const { type, payload } = result;

        if (type === TinyGLineParserResultMotorTimeout) {
          const { mt = this.state.mt } = payload;

          if (this.state.mt !== mt) {
            this.state = { // enforce change
              ...this.state,
              mt: mt
            };
          }

          this.emit('mt', payload.mt);
        } else if (type === TinyGLineParserResultPowerManagement) {
          const { pwr = this.state.pwr } = payload;

          if (!_.isEqual(this.state.pwr, pwr)) {
            this.state = { // enforce change
              ...this.state,
              pwr: pwr
            };
          }

          this.emit('pwr', payload.pwr);
        } else if (type === TinyGLineParserResultQueueReports) {
          const { qr, qi, qo } = payload;

          // The planner buffer pool size will be checked every time the planner buffer changes
          if (qr > this.plannerBufferPoolSize) {
            this.plannerBufferPoolSize = qr;
          }

          if (this.state.qr !== qr) {
            this.state = { // enforce change
              ...this.state,
              qr
            };
          }
          this.emit('qr', { qr, qi, qo });
        } else if (type === TinyGLineParserResultStatusReports) {
          // https://github.com/synthetos/TinyG/wiki/TinyG-Status-Reports
          // https://github.com/synthetos/g2/wiki/Status-Reports
          const keymaps = {
            // machine state
            'stat': 'machineState',
            // runtime line number
            'line': 'line',
            // current velocity
            'vel': 'velocity',
            // feed rate
            'feed': 'feedrate',
            // units mode
            'unit': (target, val) => {
              const gcode = {
                [TINYG_GCODE_UNITS_G20]: 'G20', // Inches mode
                [TINYG_GCODE_UNITS_G21]: 'G21' // Millimeters mode
              }[val] || '';
              _.set(target, 'modal.units', gcode);
            },
            // coordinate system
            'coor': (target, val) => {
              const gcode = {
                [TINYG_GCODE_COORDINATE_G53]: 'G53', // Machine coordinate system
                [TINYG_GCODE_COORDINATE_G54]: 'G54', // Coordinate system 1
                [TINYG_GCODE_COORDINATE_G55]: 'G55', // Coordinate system 2
                [TINYG_GCODE_COORDINATE_G56]: 'G56', // Coordinate system 3
                [TINYG_GCODE_COORDINATE_G57]: 'G57', // Coordinate system 4
                [TINYG_GCODE_COORDINATE_G58]: 'G58', // Coordinate system 5
                [TINYG_GCODE_COORDINATE_G59]: 'G59' // Coordinate system 6
              }[val] || '';
              _.set(target, 'modal.wcs', gcode);
            },
            // motion mode
            'momo': (target, val) => {
              const gcode = {
                [TINYG_GCODE_MOTION_G0]: 'G0', // Straight (linear) traverse
                [TINYG_GCODE_MOTION_G1]: 'G1', // Straight (linear) feed
                [TINYG_GCODE_MOTION_G2]: 'G2', // CW arc traverse
                [TINYG_GCODE_MOTION_G3]: 'G3', // CCW arc traverse
                [TINYG_GCODE_MOTION_G80]: 'G80' // Cancel motion mode
              }[val] || '';
              _.set(target, 'modal.motion', gcode);
            },
            // plane select
            'plan': (target, val) => {
              const gcode = {
                [TINYG_GCODE_PLANE_G17]: 'G17', // XY plane
                [TINYG_GCODE_PLANE_G18]: 'G18', // XZ plane
                [TINYG_GCODE_PLANE_G19]: 'G19' // YZ plane
              }[val] || '';
              _.set(target, 'modal.plane', gcode);
            },
            // path control mode
            'path': (target, val) => {
              const gcode = {
                [TINYG_GCODE_PATH_G61]: 'G61', // Exact path mode
                [TINYG_GCODE_PATH_G61_1]: 'G61.1', // Exact stop mode
                [TINYG_GCODE_PATH_G64]: 'G64' // Continuous mode
              }[val] || '';
              _.set(target, 'modal.path', gcode);
            },
            // distance mode
            'dist': (target, val) => {
              const gcode = {
                [TINYG_GCODE_DISTANCE_G90]: 'G90', // Absolute distance
                [TINYG_GCODE_DISTANCE_G91]: 'G91' // Incremental distance
              }[val] || '';
              _.set(target, 'modal.distance', gcode);
            },
            // arc distance mode
            'admo': (target, val) => {
              const gcode = {
                [TINYG_GCODE_DISTANCE_G90]: 'G90', // Absolute distance
                [TINYG_GCODE_DISTANCE_G91]: 'G91' // Incremental distance
              }[val] || '';
              _.set(target, 'modal.arcdistance', gcode);
            },
            // feed rate mode
            'frmo': (target, val) => {
              const gcode = {
                [TINYG_GCODE_FEEDRATE_G93]: 'G93', // Inverse time mode
                [TINYG_GCODE_FEEDRATE_G94]: 'G94', // Units-per-minute mode
                [TINYG_GCODE_FEEDRATE_G95]: 'G95' // Units-per-revolution mode
              }[val] || '';
              _.set(target, 'modal.feedrate', gcode);
            },
            // active tool
            'tool': (target, val) => {
              _.set(target, 'tool', val);
            },
            // [edge-082.10] Spindle enable (removed in edge-101.03)
            'spe': (target, val) => {
              _.set(target, 'spe', val);

              const spe = _.get(target, 'spe', 0);
              const spd = _.get(target, 'spd', 0);
              if (!spe) {
                _.set(target, 'modal.spindle', 'M5');
              } else {
                _.set(target, 'modal.spindle', (spd === 0) ? 'M3' : 'M4');
              }
            },
            // [edge-082.10] Spindle direction (removed in edge-101.03)
            'spd': (target, val) => {
              _.set(target, 'spd', val);

              const spe = _.get(target, 'spe', 0);
              const spd = _.get(target, 'spd', 0);
              if (!spe) {
                _.set(target, 'modal.spindle', 'M5');
              } else {
                _.set(target, 'modal.spindle', (spd === 0) ? 'M3' : 'M4');
              }
            },
            // [edge-101.03] Spindle control
            // 0 = OFF, 1 = CW, 2 = CCW
            'spc': (target, val) => {
              if (val === 0) { // OFF
                _.set(target, 'modal.spindle', 'M5');
              } else if (val === 1) { // CW
                _.set(target, 'modal.spindle', 'M3');
              } else if (val === 2) { // CCW
                _.set(target, 'modal.spindle', 'M4');
              }
            },
            // [edge-082.10] Spindle speed
            'sps': (target, val) => {
              _.set(target, 'sps', val);
            },
            // [edge-082.10] Mist coolant
            'com': (target, val) => {
              if (val === 0) { // Coolant Off
                _.set(target, 'modal.coolant', 'M9');
                return;
              }

              const data = ensureArray(_.get(target, 'modal.coolant', ''));
              if (data.indexOf('M8') >= 0) {
                // Mist + Flood
                _.set(target, 'modal.coolant', ['M7', 'M8']);
                return;
              }

              // Mist
              _.set(target, 'modal.coolant', 'M7');
            },
            // [edge-082.10] Flood coolant
            'cof': (target, val) => {
              if (val === 0) { // Coolant Off
                _.set(target, 'modal.coolant', 'M9');
                return;
              }

              const data = ensureArray(_.get(target, 'modal.coolant', ''));
              if (data.indexOf('M7') >= 0) {
                // Mist + Flood
                _.set(target, 'modal.coolant', ['M7', 'M8']);
                return;
              }

              // Flood
              _.set(target, 'modal.coolant', 'M8');
            },

            // Tool Length Offset
            'tofx': 'tlo.x',
            'tofy': 'tlo.y',
            'tofz': 'tlo.z',
            'tofa': 'tlo.a',
            'tofb': 'tlo.b',
            'tofc': 'tlo.c',

            // Work Position
            // {posx: ... through {posa:... are reported in the currently
            // active Units mode (G20/G21), and also apply any offsets,
            // including coordinate system selection, G92, and tool offsets.
            // These are provided to drive digital readouts
            'posx': 'wpos.x',
            'posy': 'wpos.y',
            'posz': 'wpos.z',
            'posa': 'wpos.a',
            'posb': 'wpos.b',
            'posc': 'wpos.c',

            // Machine Position
            // {mpox: ... through {mpoa:... are reported in the machine's
            // internal coordinate system (canonical machine) and will always
            // be in millimeters with no offsets.
            // These are provided to drive graphical displays so they do not
            // have to be aware of Gcode Units mode or any offsets in effect.
            'mpox': 'mpos.x',
            'mpoy': 'mpos.y',
            'mpoz': 'mpos.z',
            'mpoa': 'mpos.a',
            'mpob': 'mpos.b',
            'mpoc': 'mpos.c'
          };
          const sr = {
            ...this.state.sr,
            modal: {
              ...this.state.sr.modal
            },
            wpos: {
              ...this.state.sr.wpos
            },
            mpos: {
              ...this.state.sr.mpos
            }
          };
          _.each(keymaps, (target, key) => {
            if (typeof target === 'string') {
              const val = _.get(payload.sr, key);
              if (val !== undefined) {
                _.set(sr, target, val);
              }
            }
            if (typeof target === 'function') {
              const val = _.get(payload.sr, key);
              if (val !== undefined) {
                target(sr, val);
              }
            }
          });

          if (!_.isEqual(this.state.sr, sr)) {
            this.state = { // enforce change
              ...this.state,
              sr: sr
            };
          }
          this.emit('sr', payload.sr);
        } else if (type === TinyGLineParserResultSystemSettings) {
          this.settings = { // enforce change
            ...this.settings,
            ...payload.sys
          };
          this.emit('sys', payload.sys);
        } else if (type === TinyGLineParserResultOverrides) {
          const {
            mfo = this.settings.mfo,
            mto = this.settings.mto,
            sso = this.settings.sso
          } = payload;

          this.settings = { // enforce change
            ...this.settings,
            mfo,
            mto,
            sso
          };
          this.emit('ov', { mfo, mto, sso });
        } else if (type === TinyGLineParserResultReceiveReports) {
          const settings = {};
          for (let key in payload.r) {
            if (key in this.settings) {
              settings[key] = payload.r[key];
            }
          }
          if (Object.keys(settings).length > 0) {
            this.settings = { // enforce change
              ...this.settings,
              ...settings
            };
          }

          this.emit('r', payload.r);
        }

        if (payload.f && payload.f.length > 0) {
          this.footer.revision = payload.f[0];
          this.footer.statusCode = payload.f[1];
          this.footer.rxBufferInfo = payload.f[2];
          this.emit('f', payload.f);
        }
      }
    }

    getMachinePosition(state = this.state) {
      return _.get(state, 'sr.mpos', {});
    }

    getWorkPosition(state = this.state) {
      return _.get(state, 'sr.wpos', {});
    }

    getWorkCoordinateSystem(state = this.state) {
      const defaultWCS = 'G54';
      return _.get(state, 'sr.modal.wcs', defaultWCS);
    }

    getModalGroup(state = this.state) {
      return _.get(state, 'sr.modal', {});
    }

    getTool(state = this.state) {
      return Number(_.get(state, 'tool')) || 0;
    }

    isAlarm() {
      const machineState = _.get(this.state, 'sr.machineState');
      return machineState === TINYG_MACHINE_STATE_ALARM;
    }

    isIdle() {
      const machineState = _.get(this.state, 'sr.machineState');
      return (
        (machineState === TINYG_MACHINE_STATE_READY) ||
            (machineState === TINYG_MACHINE_STATE_STOP) ||
            (machineState === TINYG_MACHINE_STATE_END)
      );
    }
}

export default TinyGRunner;
