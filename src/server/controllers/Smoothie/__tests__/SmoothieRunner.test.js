/* eslint-env jest */
import SmoothieRunner from '../SmoothieRunner';

describe('SmoothieRunner', () => {
  // $10 - Status report mask:binary
  // Report Type      | Value
  // Machine Position | 1
  // Work Position    | 2
  // Planner Buffer   | 4
  // RX Buffer        | 8
  // Limit Pins       | 16
  test('SmoothieRunnerLineParserResultStatus: all zeroes in the mask ($10=0)', () => {
    return new Promise((resolve) => {
      const runner = new SmoothieRunner();
      runner.on('status', ({ raw, ...status }) => {
        expect(raw).toEqual('<Idle>');
        expect(status).toEqual({
          machineState: 'Idle',
        });
        resolve();
      });

      const line = '<Idle>';
      runner.parse(line);
    });
  });

  describe('SmoothieRunnerLineParserResultStatus: old status format', () => {
    test('6-axis', () => {
      return new Promise((resolve) => {
        const runner = new SmoothieRunner();
        runner.on('status', ({ raw, ...status }) => {
          expect(raw).toEqual('<Idle,MPos:200.0000,200.0000,0.0000,0.0000,0.0000,0.0000,WPos:200.0000,200.0000,0.0000>');
          expect(status).toEqual({
            machineState: 'Idle',
            mpos: {
              x: '200.0000',
              y: '200.0000',
              z: '0.0000',
              a: '0.0000',
              b: '0.0000',
              c: '0.0000',
            },
            wpos: {
              x: '200.0000',
              y: '200.0000',
              z: '0.0000',
            }
          });
          resolve();
        });

        const line = '<Idle,MPos:200.0000,200.0000,0.0000,0.0000,0.0000,0.0000,WPos:200.0000,200.0000,0.0000>';
        runner.parse(line);
      });
    });
  });

  describe('SmoothieRunnerLineParserResultStatus: new status format', () => {
    test('6-axis', () => {
      return new Promise((resolve) => {
        const runner = new SmoothieRunner();
        runner.on('status', ({ raw, ...status }) => {
          expect(raw).toEqual('<Idle|MPos:200.0000,200.0000,0.0000,0.0000,0.0000,0.0000|WPos:200.0000,200.0000,0.0000|F:4000.0,100.0>');
          expect(status).toEqual({
            machineState: 'Idle',
            mpos: {
              x: '200.0000',
              y: '200.0000',
              z: '0.0000',
              a: '0.0000',
              b: '0.0000',
              c: '0.0000',
            },
            wpos: {
              x: '200.0000',
              y: '200.0000',
              z: '0.0000',
            },
            feedrate: 4000,
            feedrateOverride: 100,
          });
          resolve();
        });

        const line = '<Idle|MPos:200.0000,200.0000,0.0000,0.0000,0.0000,0.0000|WPos:200.0000,200.0000,0.0000|F:4000.0,100.0>';
        runner.parse(line);
      });
    });

    test('Laser', () => {
      return new Promise((resolve) => {
        const runner = new SmoothieRunner();
        runner.on('status', ({ raw, ...status }) => {
          expect(raw).toEqual('<Idle|MPos:200.0000,200.0000,0.0000,0.0000,0.0000,0.0000|WPos:200.0000,200.0000,0.0000|F:4000.0,100.0|L:0.0000|S:0.8000>');
          expect(status).toEqual({
            machineState: 'Idle',
            mpos: {
              x: '200.0000',
              y: '200.0000',
              z: '0.0000',
              a: '0.0000',
              b: '0.0000',
              c: '0.0000',
            },
            wpos: {
              x: '200.0000',
              y: '200.0000',
              z: '0.0000',
            },
            feedrate: 4000,
            feedrateOverride: 100,
            laserPower: 0,
            laserIntensity: 0.8,
          });
          resolve();
        });

        const line = '<Idle|MPos:200.0000,200.0000,0.0000,0.0000,0.0000,0.0000|WPos:200.0000,200.0000,0.0000|F:4000.0,100.0|L:0.0000|S:0.8000>';
        runner.parse(line);
      });
    });

    test('Home', () => {
      return new Promise((resolve) => {
        const runner = new SmoothieRunner();
        runner.on('status', ({ raw, ...status }) => {
          expect(raw).toEqual('<Home|MPos:15.8250,15.8250,0.0000|WPos:15.8250,15.8250,0.0000|F:4000.0,4000.0,100.0>');
          expect(status).toEqual({
            machineState: 'Home',
            mpos: {
              x: '15.8250',
              y: '15.8250',
              z: '0.0000',
            },
            wpos: {
              x: '15.8250',
              y: '15.8250',
              z: '0.0000',
            },
            currentFeedrate: 4000,
            feedrate: 4000,
            feedrateOverride: 100,
          });
          resolve();
        });

        const line = '<Home|MPos:15.8250,15.8250,0.0000|WPos:15.8250,15.8250,0.0000|F:4000.0,4000.0,100.0>';
        runner.parse(line);
      });
    });

    test('Run', () => {
      return new Promise((resolve) => {
        const runner = new SmoothieRunner();
        runner.on('status', ({ raw, ...status }) => {
          expect(raw).toEqual('<Run|MPos:15.8250,15.8250,0.0000|WPos:15.8250,15.8250,0.0000|F:4000.0,4000.0,100.0>');
          expect(status).toEqual({
            machineState: 'Run',
            mpos: {
              x: '15.8250',
              y: '15.8250',
              z: '0.0000',
            },
            wpos: {
              x: '15.8250',
              y: '15.8250',
              z: '0.0000',
            },
            currentFeedrate: 4000,
            feedrate: 4000,
            feedrateOverride: 100,
          });
          resolve();
        });

        const line = '<Run|MPos:15.8250,15.8250,0.0000|WPos:15.8250,15.8250,0.0000|F:4000.0,4000.0,100.0>';
        runner.parse(line);
      });
    });

    test('Idle', () => {
      return new Promise((resolve) => {
        const runner = new SmoothieRunner();
        runner.on('status', ({ raw, ...status }) => {
          expect(raw).toEqual('<Idle|MPos:200.0000,200.0000,0.0000|WPos:200.0000,200.0000,0.0000|F:4000.0,100.0>');
          expect(status).toEqual({
            machineState: 'Idle',
            mpos: {
              x: '200.0000',
              y: '200.0000',
              z: '0.0000',
            },
            wpos: {
              x: '200.0000',
              y: '200.0000',
              z: '0.0000',
            },
            feedrate: 4000,
            feedrateOverride: 100,
          });
          resolve();
        });

        const line = '<Idle|MPos:200.0000,200.0000,0.0000|WPos:200.0000,200.0000,0.0000|F:4000.0,100.0>';
        runner.parse(line);
      });
    });

    test('state transition', () => {
      return new Promise((resolve) => {
        let lineNumber = 0;
        const lines = [
          '<Run|MPos:15.8250,15.8250,0.0000|WPos:15.8250,15.8250,0.0000|F:4000.0,4000.0,100.0>',
          '<Idle|MPos:200.0000,200.0000,0.0000|WPos:200.0000,200.0000,0.0000|F:4000.0,100.0>',
        ];
        const expectedResults = [
          { // Run
            machineState: 'Run',
            mpos: {
              x: '15.8250',
              y: '15.8250',
              z: '0.0000',
            },
            wpos: {
              x: '15.8250',
              y: '15.8250',
              z: '0.0000',
            },
            currentFeedrate: 4000,
            feedrate: 4000,
            feedrateOverride: 100,
          },
          { // Idle
            machineState: 'Idle',
            mpos: {
              x: '200.0000',
              y: '200.0000',
              z: '0.0000',
            },
            wpos: {
              x: '200.0000',
              y: '200.0000',
              z: '0.0000',
            },
            feedrate: 4000,
            feedrateOverride: 100,
          }
        ];

        const runner = new SmoothieRunner();
        runner.on('status', ({ raw, ...status }) => {
          const index = lineNumber - 1;
          expect(raw).toEqual(lines[index]);
          expect(status).toEqual(expectedResults[index]);

          if (lineNumber === lines.length) {
            resolve();
          }
        });

        lines.forEach((line, index) => {
          lineNumber = index + 1;
          runner.parse(line);
        });
      });
    });
  });

  test('SmoothieRunnerLineParserResultOk', () => {
    return new Promise((resolve) => {
      const runner = new SmoothieRunner();
      runner.on('ok', ({ raw }) => {
        expect(raw).toEqual('ok');
        resolve();
      });

      const line = 'ok';
      runner.parse(line);
    });
  });

  test('SmoothieRunnerLineParserResultError', () => {
    return new Promise((resolve) => {
      const runner = new SmoothieRunner();
      runner.on('error', ({ raw, message }) => {
        expect(raw).toEqual('error: Expected command letter');
        expect(message).toEqual('Expected command letter');
        resolve();
      });

      const line = 'error: Expected command letter';
      runner.parse(line);
    });
  });

  test('SmoothieRunnerLineParserResultAlarm', () => {
    return new Promise((resolve) => {
      const runner = new SmoothieRunner();
      runner.on('alarm', ({ raw, message }) => {
        expect(raw).toEqual('ALARM: Probe fail');
        expect(message).toEqual('Probe fail');
        resolve();
      });

      const line = 'ALARM: Probe fail';
      runner.parse(line);
    });
  });

  describe('SmoothieRunnerLineParserResultParserState', () => {
    test('#1', () => {
      return new Promise((resolve) => {
        const runner = new SmoothieRunner();
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
              program: 'M0',
              spindle: 'M5',
              coolant: 'M9'
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

    test('#2', () => {
      return new Promise((resolve) => {
        const runner = new SmoothieRunner();
        runner.on('parserstate', ({ raw, ...parserstate }) => {
          expect(raw).toEqual('[G0 G54 G17 G21 G90 G94 M0 M5 M7 M8 T2 F2540. S0.]');
          expect(parserstate).toEqual({
            modal: {
              motion: 'G0', // G0, G1, G2, G3, G38.2, G38.3, G38.4, G38.5, G80
              wcs: 'G54', // G54, G55, G56, G57, G58, G59
              plane: 'G17', // G17: xy-plane, G18: xz-plane, G19: yz-plane
              units: 'G21', // G20: Inches, G21: Millimeters
              distance: 'G90', // G90: Absolute, G91: Relative
              feedrate: 'G94', // G93: Inverse Time Mode, G94: Units Per Minutes
              program: 'M0',
              spindle: 'M5',
              coolant: ['M7', 'M8']
            },
            tool: '2',
            feedrate: '2540.',
            spindle: '0.'
          });
          expect(runner.getTool()).toEqual(2);
          resolve();
        });

        const line = '[G0 G54 G17 G21 G90 G94 M0 M5 M7 M8 T2 F2540. S0.]';
        runner.parse(line);
      });
    });
  });

  test('SmoothieRunnerLineParserResultParameters:G54,G55,G56,G57,G58,G59,G28,G30,G92', () => {
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
      const runner = new SmoothieRunner();
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

  test('SmoothieRunnerLineParserResultParameters:TLO', () => {
    return new Promise((resolve) => {
      const runner = new SmoothieRunner();
      runner.on('parameters', ({ name, value, raw }) => {
        expect(raw).toEqual('[TLO:0.000]');
        expect(name).toEqual('TLO');
        expect(value).toEqual('0.000');
        resolve();
      });

      runner.parse('[TLO:0.000]');
    });
  });

  test('SmoothieRunnerLineParserResultParameters:PRB', () => {
    return new Promise((resolve) => {
      const runner = new SmoothieRunner();
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

  test('SmoothieRunnerLineParserResultVersion', () => {
    return new Promise((resolve) => {
      const runner = new SmoothieRunner();
      runner.on('version', ({ raw, ...others }) => {
        expect(raw).toEqual('Build version: edge-3332442, Build date: xxx, MCU: LPC1769, System Clock: 120MHz');
        expect(others).toEqual({
          build: {
            version: 'edge-3332442',
            date: 'xxx'
          },
          mcu: 'LPC1769',
          sysclk: '120MHz'
        });
        resolve();
      });

      const line = 'Build version: edge-3332442, Build date: xxx, MCU: LPC1769, System Clock: 120MHz';
      runner.parse(line);
    });
  });

  test('Not supported output format', () => {
    return new Promise((resolve) => {
      const runner = new SmoothieRunner();
      runner.on('others', ({ raw }) => {
        expect(raw).toEqual('Not supported output format');
        resolve();
      });

      const line = 'Not supported output format';
      runner.parse(line);
    });
  });
});
