/* eslint-env jest */
import trim from 'lodash/trim';
import GrblRunner from '../GrblRunner';

describe('GrblRunner', () => {
  // $10 - Status report mask:binary
  // Report Type      | Value
  // Machine Position | 1
  // Work Position    | 2
  // Planner Buffer   | 4
  // RX Buffer        | 8
  // Limit Pins       | 16
  test('GrblLineParserResultStatus: all zeroes in the mask ($10=0)', () => {
    return new Promise((resolve) => {
      const runner = new GrblRunner();
      runner.on('status', ({ raw, ...status }) => {
        expect(raw).toEqual('<Idle>');
        expect(status).toEqual({
          activeState: 'Idle',
          subState: 0
        });
        resolve();
      });

      const line = '<Idle>';
      runner.parse(line);
    });
  });

  test('GrblLineParserResultStatus: default ($10=3)', () => {
    return new Promise((resolve) => {
      const runner = new GrblRunner();
      runner.on('status', ({ raw, ...status }) => {
        expect(raw).toEqual('<Idle,MPos:5.529,0.560,7.000,WPos:1.529,-5.440,-0.000>');
        expect(status).toEqual({
          activeState: 'Idle',
          subState: 0,
          mpos: {
            x: '5.529',
            y: '0.560',
            z: '7.000'
          },
          wpos: {
            x: '1.529',
            y: '-5.440',
            z: '-0.000'
          }
        });
        resolve();
      });

      const line = '<Idle,MPos:5.529,0.560,7.000,WPos:1.529,-5.440,-0.000>';
      runner.parse(line);
    });
  });

  test('GrblLineParserResultStatus: 6-axis', () => {
    return new Promise((resolve) => {
      const runner = new GrblRunner();
      runner.on('status', ({ raw, ...status }) => {
        expect(raw).toEqual('<Idle,MPos:5.529,0.560,7.000,0.100,0.250,0.500,WPos:1.529,-5.440,-0.000,0.100,0.250,0.500>');
        expect(status).toEqual({
          activeState: 'Idle',
          subState: 0,
          mpos: {
            x: '5.529',
            y: '0.560',
            z: '7.000',
            a: '0.100',
            b: '0.250',
            c: '0.500'
          },
          wpos: {
            x: '1.529',
            y: '-5.440',
            z: '-0.000',
            a: '0.100',
            b: '0.250',
            c: '0.500'
          }
        });
        resolve();
      });

      const line = '<Idle,MPos:5.529,0.560,7.000,0.100,0.250,0.500,WPos:1.529,-5.440,-0.000,0.100,0.250,0.500>';
      runner.parse(line);
    });
  });

  test('GrblLineParserResultStatus: set all bits to 1 ($10=31)', () => {
    return new Promise((resolve) => {
      const runner = new GrblRunner();
      runner.on('status', ({ raw, ...status }) => {
        expect(raw).toEqual('<Idle,MPos:5.529,0.560,7.000,WPos:1.529,-5.440,-0.000,Buf:0,RX:0,Lim:000>');
        expect(status).toEqual({
          activeState: 'Idle',
          subState: 0,
          mpos: {
            x: '5.529',
            y: '0.560',
            z: '7.000'
          },
          wpos: {
            x: '1.529',
            y: '-5.440',
            z: '-0.000'
          },
          buf: {
            planner: 0,
            rx: 0
          },
          pinState: ''
        });
        resolve();
      });

      const line = '<Idle,MPos:5.529,0.560,7.000,WPos:1.529,-5.440,-0.000,Buf:0,RX:0,Lim:000>';
      runner.parse(line);
    });
  });

  test('GrblLineParserResultOk', () => {
    return new Promise((resolve) => {
      const runner = new GrblRunner();
      runner.on('ok', ({ raw }) => {
        expect(raw).toEqual('ok');
        resolve();
      });

      const line = 'ok';
      runner.parse(line);
    });
  });

  test('GrblLineParserResultError', () => {
    return new Promise((resolve) => {
      const runner = new GrblRunner();
      runner.on('error', ({ raw, message }) => {
        expect(raw).toEqual('error: Expected command letter');
        expect(message).toEqual('Expected command letter');
        resolve();
      });

      const line = 'error: Expected command letter';
      runner.parse(line);
    });
  });

  test('GrblLineParserResultAlarm', () => {
    return new Promise((resolve) => {
      const runner = new GrblRunner();
      runner.on('alarm', ({ raw, message }) => {
        expect(raw).toEqual('ALARM: Probe fail');
        expect(message).toEqual('Probe fail');
        resolve();
      });

      const line = 'ALARM: Probe fail';
      runner.parse(line);
    });
  });

  test('GrblLineParserResultAlarm: sets activeState', () => {
    return new Promise((resolve) => {
      const runner = new GrblRunner();
      runner.on('alarm', () => {
        expect(runner.state.status.activeState).toEqual('Alarm');
        resolve();
      });

      const line = 'ALARM:2';
      runner.parse(line);
    });
  });

  describe('GrblLineParserResultParserState', () => {
    test('Grbl v0.9', () => {
      return new Promise((resolve) => {
        const runner = new GrblRunner();
        runner.on('parserstate', ({ raw, ...parserstate }) => {
          expect(raw).toEqual('[G0 G54 G17 G21 G90 G94 M0 M5 M9 T0 F2540. S0.]');
          expect(parserstate).toEqual({
            modal: {
              motion: 'G0', // G0, G1, G2, G3, G38.2, G38.3, G38.4, G38.5, G80
              wcs: 'G54', // G54, G55, G56, G57, G58, G59
              plane: 'G17', // G17: xy-plane, G18: xz-plane, G19: yz-plane
              units: 'G21', // G20: Inches, G21: Millimeters
              distance: 'G90', // G90: Absolute, G91: Relative
              feedrate: 'G94', // G93: Inverse Time Mode, G94: Units Per Minutes
              program: 'M0', // M0, M1, M2, M30
              spindle: 'M5', // M3, M4, M5
              coolant: 'M9', // M7, M8, M9
            },
            tool: '0',
            feedrate: '2540.',
            spindle: '0.'
          });
          expect(runner.getTool()).toEqual(0);
          resolve();
        });

        const line = '[G0 G54 G17 G21 G90 G94 M0 M5 M9 T0 F2540. S0.]';
        runner.parse(line);
      });
    });

    test('Grbl v1.x', () => {
      return new Promise((resolve) => {
        const runner = new GrblRunner();
        runner.on('parserstate', ({ raw, ...parserstate }) => {
          expect(raw).toEqual('[GC:G0 G54 G17 G21 G90 G94 M0 M5 M9 T0 F2540. S0.]');
          expect(parserstate).toEqual({
            modal: {
              motion: 'G0', // G0, G1, G2, G3, G38.2, G38.3, G38.4, G38.5, G80
              wcs: 'G54', // G54, G55, G56, G57, G58, G59
              plane: 'G17', // G17: xy-plane, G18: xz-plane, G19: yz-plane
              units: 'G21', // G20: Inches, G21: Millimeters
              distance: 'G90', // G90: Absolute, G91: Relative
              feedrate: 'G94', // G93: Inverse Time Mode, G94: Units Per Minutes
              program: 'M0', // M0, M1, M2, M30
              spindle: 'M5', // M3, M4, M5
              coolant: 'M9', // M7, M8, M9
            },
            tool: '0',
            feedrate: '2540.',
            spindle: '0.',
          });
          expect(runner.getTool()).toEqual(0);
          resolve();
        });

        const line = '[GC:G0 G54 G17 G21 G90 G94 M0 M5 M9 T0 F2540. S0.]';
        runner.parse(line);
      });
    });

    test('Grbl v1.x - mist coolant (M7) and flood coolant (M8)', () => {
      return new Promise((resolve) => {
        const runner = new GrblRunner();
        runner.on('parserstate', ({ raw, ...parserstate }) => {
          expect(raw).toEqual('[GC:G0 G54 G17 G21 G90 G94 M0 M3 M7 M8 T0 F2000 S20]');
          expect(parserstate).toEqual({
            modal: {
              motion: 'G0', // G0, G1, G2, G3, G38.2, G38.3, G38.4, G38.5, G80
              wcs: 'G54', // G54, G55, G56, G57, G58, G59
              plane: 'G17', // G17: xy-plane, G18: xz-plane, G19: yz-plane
              units: 'G21', // G20: Inches, G21: Millimeters
              distance: 'G90', // G90: Absolute, G91: Relative
              feedrate: 'G94', // G93: Inverse Time Mode, G94: Units Per Minutes
              program: 'M0', // M0, M1, M2, M30
              spindle: 'M3', // M3, M4, M5
              coolant: ['M7', 'M8'], // M7, M8, M9
            },
            tool: '0',
            feedrate: '2000',
            spindle: '20',
          });
          expect(runner.getTool()).toEqual(0);
          resolve();
        });

        const line = '[GC:G0 G54 G17 G21 G90 G94 M0 M3 M7 M8 T0 F2000 S20]';
        runner.parse(line);
      });
    });

    test('Handles cases where Grbl forks omit numeric values after the "M" field', () => {
      return new Promise((resolve) => {
        const runner = new GrblRunner();
        runner.on('parserstate', ({ raw, ...parserstate }) => {
          expect(raw).toEqual('[GC:G0 G54 G17 G21 G90 G94 M5 M M9 T0 F0 S0]');
          expect(parserstate).toEqual({
            modal: {
              motion: 'G0', // G0, G1, G2, G3, G38.2, G38.3, G38.4, G38.5, G80
              wcs: 'G54', // G54, G55, G56, G57, G58, G59
              plane: 'G17', // G17: xy-plane, G18: xz-plane, G19: yz-plane
              units: 'G21', // G20: Inches, G21: Millimeters
              distance: 'G90', // G90: Absolute, G91: Relative
              feedrate: 'G94', // G93: Inverse Time Mode, G94: Units Per Minutes
              //program: undefined, // M0, M1, M2, M30
              spindle: 'M5', // M3, M4, M5
              coolant: 'M9', // M7, M8, M9
            },
            tool: '0',
            feedrate: '0',
            spindle: '0',
          });
          expect(runner.getTool()).toEqual(0);
          resolve();
        });

        const line = '[GC:G0 G54 G17 G21 G90 G94 M5 M M9 T0 F0 S0]';
        runner.parse(line);
      });
    });

    test('Handles cases where Grbl forks omit numeric values after the "T" field', () => {
      return new Promise((resolve) => {
        const runner = new GrblRunner();
        runner.on('parserstate', ({ raw, ...parserstate }) => {
          expect(raw).toEqual('[GC:G0 G54 G17 G21 G90 G94 M5 M9 T F0 S0]');
          expect(parserstate).toEqual({
            modal: {
              motion: 'G0', // G0, G1, G2, G3, G38.2, G38.3, G38.4, G38.5, G80
              wcs: 'G54', // G54, G55, G56, G57, G58, G59
              plane: 'G17', // G17: xy-plane, G18: xz-plane, G19: yz-plane
              units: 'G21', // G20: Inches, G21: Millimeters
              distance: 'G90', // G90: Absolute, G91: Relative
              feedrate: 'G94', // G93: Inverse Time Mode, G94: Units Per Minutes
              //program: undefined, // M0, M1, M2, M30
              spindle: 'M5', // M3, M4, M5
              coolant: 'M9', // M7, M8, M9
            },
            //tool: undefined,
            feedrate: '0',
            spindle: '0',
          });
          expect(runner.getTool()).toEqual(0);
          resolve();
        });

        const line = '[GC:G0 G54 G17 G21 G90 G94 M5 M9 T F0 S0]';
        runner.parse(line);
      });
    });

    test('Handles invalid parser state output', () => {
      return new Promise((resolve, reject) => {
        const runner = new GrblRunner();
        runner.on('parserstate', () => {
          reject(new Error('Parser state should not be emitted for invalid input'));
        });
        runner.on('feedback', ({ raw }) => {
          expect(raw).toEqual('[Invalid Parser State Output]');
          resolve();
        });
        const line = '[Invalid Parser State Output]';
        runner.parse(line);
      });
    });
  });

  test('GrblLineParserResultParameters:G54,G55,G56,G57,G58,G59,G28,G30,G92', () => {
    return new Promise((resolve) => {
      const lines = [
        '[G54:0.000,0.000,0.000]',
        '[G55:0.000,0.000,0.000]',
        '[G56:0.000,0.000,0.000]',
        '[G57:0.000,0.000,0.000]',
        '[G58:0.000,0.000,0.000]',
        '[G59:0.000,0.000,0.000]',
        '[G28:0.000,0.000,0.000]',
        '[G30:0.000,0.000,0.000]',
        '[G92:0.000,0.000,0.000]'
      ];
      const runner = new GrblRunner();
      let i = 0;
      runner.on('parameters', ({ name, value, raw }) => {
        if (i < lines.length) {
          expect(raw).toEqual(lines[i]);
        }
        if (name === 'G54') {
          expect(value).toEqual({ x: '0.000', y: '0.000', z: '0.000' });
        }
        if (name === 'G55') {
          expect(value).toEqual({ x: '0.000', y: '0.000', z: '0.000' });
        }
        if (name === 'G56') {
          expect(value).toEqual({ x: '0.000', y: '0.000', z: '0.000' });
        }
        if (name === 'G57') {
          expect(value).toEqual({ x: '0.000', y: '0.000', z: '0.000' });
        }
        if (name === 'G58') {
          expect(value).toEqual({ x: '0.000', y: '0.000', z: '0.000' });
        }
        if (name === 'G59') {
          expect(value).toEqual({ x: '0.000', y: '0.000', z: '0.000' });
        }
        if (name === 'G28') {
          expect(value).toEqual({ x: '0.000', y: '0.000', z: '0.000' });
        }
        if (name === 'G30') {
          expect(value).toEqual({ x: '0.000', y: '0.000', z: '0.000' });
        }
        if (name === 'G92') {
          expect(value).toEqual({ x: '0.000', y: '0.000', z: '0.000' });
        }

        ++i;
        if (i >= lines.length) {
          resolve();
        }
      });

      lines.forEach(line => {
        runner.parse(line);
      });
    });
  });

  test('GrblLineParserResultParameters:TLO', () => {
    return new Promise((resolve) => {
      const runner = new GrblRunner();
      runner.on('parameters', ({ name, value, raw }) => {
        expect(raw).toEqual('[TLO:0.000]');
        expect(name).toEqual('TLO');
        expect(value).toEqual('0.000');
        resolve();
      });

      runner.parse('[TLO:0.000]');
    });
  });

  test('GrblLineParserResultParameters:PRB', () => {
    return new Promise((resolve) => {
      const runner = new GrblRunner();
      runner.on('parameters', ({ name, value, raw }) => {
        expect(raw).toEqual('[PRB:0.000,0.000,1.492:1]');
        expect(name).toEqual('PRB');
        expect(value).toEqual({
          result: 1,
          x: '0.000',
          y: '0.000',
          z: '1.492'
        });
        resolve();
      });

      runner.parse('[PRB:0.000,0.000,1.492:1]');
    });
  });

  test('GrblLineParserResultFeedback', () => {
    return new Promise((resolve) => {
      const lines = [
        // $I - View build info
        '[0.9j.20160303:]',
        // Sent after an alarm message to tell the user to reset Grbl as an acknowledgement that an alarm has happened.
        '[Reset to continue]',
        // After an alarm and the user has sent a reset,
        '[\'$H\'|\'$X\' to unlock]',
        // This feedback message is sent when the user overrides the alarm.
        '[Caution: Unlocked]',
        // $C - Check gcode mode
        '[Enabled]',
        '[Disabled]'
      ];
      const runner = new GrblRunner();
      let i = 0;
      runner.on('feedback', ({ raw, ...full }) => {
        const message = trim(lines[i], '[]');

        if (i < lines.length) {
          expect(raw).toEqual(lines[i]);
          expect(full.message).toEqual(message);
        }

        ++i;
        if (i >= lines.length) {
          resolve();
        }
      });

      lines.forEach(line => {
        runner.parse(line);
      });
    });
  });

  test('GrblLineParserResultSettings', () => {
    return new Promise((resolve) => {
      const lines = [
        '$1=25 (step idle delay, msec)',
        '$2=0 (step port invert mask:00000000)',
        '$3=0 (dir port invert mask:00000000)',
        '$4=0 (step enable invert, bool)',
        '$5=0 (limit pins invert, bool)',
        '$6=0 (probe pin invert, bool)',
        '$10=3 (status report mask:00000011)',
        '$11=0.020 (junction deviation, mm)',
        '$12=0.002 (arc tolerance, mm)',
        '$13=0 (report inches, bool)',
        '$20=0 (soft limits, bool)',
        '$21=0 (hard limits, bool)',
        '$22=0 (homing cycle, bool)',
        '$23=0 (homing dir invert mask:00000000)',
        '$24=25.000 (homing feed, mm/min)',
        '$25=500.000 (homing seek, mm/min)',
        '$26=250 (homing debounce, msec)',
        '$27=1.000 (homing pull-off, mm)',
        '$100=320.000 (x, step/mm)',
        '$101=320.000 (y, step/mm)',
        '$102=250.000 (z, step/mm)',
        '$110=2500.000 (x max rate, mm/min)',
        '$111=2500.000 (y max rate, mm/min)',
        '$112=500.000 (z max rate, mm/min)',
        '$120=250.000 (x accel, mm/sec^2)',
        '$121=250.000 (y accel, mm/sec^2)',
        '$122=50.000 (z accel, mm/sec^2)',
        '$130=200.000 (x max travel, mm)',
        '$131=200.000 (y max travel, mm)',
        '$132=200.000 (z max travel, mm)'
      ];
      const runner = new GrblRunner();
      let i = 0;
      runner.on('settings', ({ raw, name, value, message }) => {
        if (i < lines.length) {
          const r = raw.match(/^(\$[^=]+)=([^ ]*)\s*(.*)/);
          expect(raw).toEqual(lines[i]);
          expect(name).toEqual(r[1]);
          expect(value).toEqual(r[2]);
          expect(message).toEqual(trim(r[3], '()'));
        }

        ++i;
        if (i >= lines.length) {
          resolve();
        }
      });

      lines.forEach(line => {
        runner.parse(line);
      });
    });
  });

  describe('GrblLineParserResultStartup', () => {
    test('Grbl 0.9j', () => {
      return new Promise((resolve) => {
        const runner = new GrblRunner();
        runner.on('startup', ({ raw, firmware, version, message }) => {
          expect(raw).toEqual('Grbl 0.9j [\'$\' for help]');
          expect(firmware).toEqual('Grbl');
          expect(version).toEqual('0.9j');
          expect(message).toEqual('[\'$\' for help]');
          resolve();
        });

        const line = 'Grbl 0.9j [\'$\' for help]';
        runner.parse(line);
      });
    });

    test('Grbl 1.1f', () => {
      return new Promise((resolve) => {
        const runner = new GrblRunner();
        runner.on('startup', ({ raw, firmware, version, message }) => {
          expect(raw).toEqual('Grbl 1.1f [\'$\' for help]');
          expect(firmware).toEqual('Grbl');
          expect(version).toEqual('1.1f');
          expect(message).toEqual('[\'$\' for help]');
          resolve();
        });

        const line = 'Grbl 1.1f [\'$\' for help]';
        runner.parse(line);
      });
    });

    test('Custom firmware build', () => {
      return new Promise((resolve) => {
        const runner = new GrblRunner();
        runner.on('startup', ({ raw, firmware, version, message }) => {
          expect(raw).toEqual('Grbl 1.2.3');
          expect(firmware).toEqual('Grbl');
          expect(version).toEqual('1.2.3');
          expect(message).toEqual('');
          resolve();
        });

        const line = 'Grbl 1.2.3';
        runner.parse(line);
      });
    });

    test('Custom firmware build: LongMill build #1', () => {
      return new Promise((resolve) => {
        const runner = new GrblRunner();
        runner.on('startup', ({ raw, firmware, version, message }) => {
          expect(raw).toEqual('Grbl 1.1h: LongMill build [\'$\' for help]');
          expect(firmware).toEqual('Grbl');
          expect(version).toEqual('1.1h');
          expect(message).toEqual(': LongMill build [\'$\' for help]');
          resolve();
        });

        const line = 'Grbl 1.1h: LongMill build [\'$\' for help]';
        runner.parse(line);
      });
    });

    test('Custom firmware build: LongMill build #2', () => {
      return new Promise((resolve) => {
        const runner = new GrblRunner();
        runner.on('startup', ({ raw, firmware, version, message }) => {
          expect(raw).toEqual('Grbl 1.1h [\'$\' for help] LongMill build Feb 25, 2020');
          expect(firmware).toEqual('Grbl');
          expect(version).toEqual('1.1h');
          expect(message).toEqual('[\'$\' for help] LongMill build Feb 25, 2020');
          resolve();
        });

        const line = 'Grbl 1.1h [\'$\' for help] LongMill build Feb 25, 2020';
        runner.parse(line);
      });
    });

    test('Custom firmware build: vCarvin', () => {
      return new Promise((resolve) => {
        const runner = new GrblRunner();
        runner.on('startup', ({ raw, firmware, version, message }) => {
          expect(raw).toEqual('vCarvin 2.0.0 [\'$\' for help]');
          expect(firmware).toEqual('vCarvin');
          expect(version).toEqual('2.0.0');
          expect(message).toEqual('[\'$\' for help]');
          resolve();
        });

        const line = 'vCarvin 2.0.0 [\'$\' for help]';
        runner.parse(line);
      });
    });
  });

  test('Not supported output format', () => {
    return new Promise((resolve) => {
      const runner = new GrblRunner();
      runner.on('others', ({ raw }) => {
        expect(raw).toEqual('Not supported output format');
        resolve();
      });

      const line = 'Not supported output format';
      runner.parse(line);
    });
  });
});
