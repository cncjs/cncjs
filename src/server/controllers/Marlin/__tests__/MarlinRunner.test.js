/* eslint-env jest */
import MarlinRunner from '../MarlinRunner';

describe('MarlinRunner', () => {
  test('MarlinLineParserResultEcho', () => {
    return new Promise((resolve) => {
      const runner = new MarlinRunner();
      runner.on('echo', ({ raw, message }) => {
        expect(raw).toEqual('echo:message');
        expect(message).toEqual('message');
        resolve();
      });

      const line = 'echo:message';
      runner.parse(line);
    });
  });

  test('MarlinLineParserResultError', () => {
    return new Promise((resolve) => {
      const runner = new MarlinRunner();
      runner.on('error', ({ raw, message }) => {
        expect(raw).toEqual('Error:Printer halted. kill() called!');
        expect(message).toEqual('Printer halted. kill() called!');
        resolve();
      });

      const line = 'Error:Printer halted. kill() called!';
      runner.parse(line);
    });
  });

  test('MarlinLineParserResultFirmware', () => {
    return new Promise((resolve) => {
      const runner = new MarlinRunner();
      runner.on('firmware', (payload) => {
        const { raw, firmwareName, protocolVersion, machineType, extruderCount, uuid } = payload;

        expect(raw).toEqual('FIRMWARE_NAME:Marlin 1.1.0 (Github) SOURCE_CODE_URL:https://github.com/MarlinFirmware/Marlin PROTOCOL_VERSION:1.0 MACHINE_TYPE:RepRap EXTRUDER_COUNT:1 UUID:cede2a2f-41a2-4748-9b12-c55c62f367ff');
        expect(firmwareName).toEqual('Marlin 1.1.0');
        expect(protocolVersion).toEqual('1.0');
        expect(machineType).toEqual('RepRap');
        expect(extruderCount).toEqual(1);
        expect(uuid).toEqual('cede2a2f-41a2-4748-9b12-c55c62f367ff');
        resolve();
      });

      const line = 'FIRMWARE_NAME:Marlin 1.1.0 (Github) SOURCE_CODE_URL:https://github.com/MarlinFirmware/Marlin PROTOCOL_VERSION:1.0 MACHINE_TYPE:RepRap EXTRUDER_COUNT:1 UUID:cede2a2f-41a2-4748-9b12-c55c62f367ff';
      runner.parse(line);
    });
  });

  test('MarlinLineParserResultOk', () => {
    return new Promise((resolve) => {
      const runner = new MarlinRunner();
      runner.on('ok', ({ raw }) => {
        expect(raw).toEqual('ok');
        resolve();
      });

      const line = 'ok';
      runner.parse(line);
    });
  });

  describe('MarlinLineParserResultPosition', () => {
    test('X/Y/Z/E', () => {
      return new Promise((resolve) => {
        const runner = new MarlinRunner();
        runner.on('pos', ({ raw, pos }) => {
          expect(raw).toEqual('X:1.529 Y:-5.440 Z:0.00 E:0.00 Count X:0 Y:0 Z:0');
          expect(pos).toEqual({
            x: '1.529',
            y: '-5.440',
            z: '0.00',
            e: '0.00'
          });
          resolve();
        });

        const line = 'X:1.529 Y:-5.440 Z:0.00 E:0.00 Count X:0 Y:0 Z:0';
        runner.parse(line);
      });
    });

    test('X/Y/Z/A/B/C', () => {
      return new Promise((resolve) => {
        const runner = new MarlinRunner();
        runner.on('pos', ({ raw, pos }) => {
          expect(raw).toEqual('X:20.000 Y:41.000 Z:38.000 A:34.000 B:24.000 C:17.000 Count X:9311 Y:18922 Z:15200 A:536 B:378 C:268');
          expect(pos).toEqual({
            x: '20.000',
            y: '41.000',
            z: '38.000',
            a: '34.000',
            b: '24.000',
            c: '17.000',
          });
          resolve();
        });

        const line = 'X:20.000 Y:41.000 Z:38.000 A:34.000 B:24.000 C:17.000 Count X:9311 Y:18922 Z:15200 A:536 B:378 C:268';
        runner.parse(line);
      });
    });
  });

  test('MarlinLineParserResultStart', () => {
    return new Promise((resolve) => {
      const runner = new MarlinRunner();
      runner.on('start', ({ raw }) => {
        expect(raw).toEqual('start');
        resolve();
      });

      const line = 'start';
      runner.parse(line);
    });
  });

  describe('MarlinLineParserResultTemperature', () => {
    test('ok T:0', () => {
      return new Promise((resolve) => {
        const runner = new MarlinRunner();
        runner.on('temperature', ({ raw, ok, extruder, heatedBed, hotend, wait }) => {
          expect(raw).toEqual('ok T:0');
          expect(ok).toEqual(true);
          expect(extruder).toEqual({});
          expect(heatedBed).toEqual({});
          expect(hotend).toEqual({});
          expect(wait).toEqual(undefined);
          resolve();
        });

        const line = 'ok T:0';
        runner.parse(line);
      });
    });

    test('ok T:293.0 /0.0 B:25.9 /0.0 @:0 B@:0', () => {
      return new Promise((resolve) => {
        const runner = new MarlinRunner();
        runner.on('temperature', ({ raw, ok, extruder, heatedBed, hotend, wait }) => {
          expect(raw).toEqual('ok T:293.0 /0.0 B:25.9 /0.0 @:0 B@:0');
          expect(ok).toEqual(true);
          expect(extruder).toEqual({
            deg: '293.0',
            degTarget: '0.0',
            power: '0',
          });
          expect(heatedBed).toEqual({
            deg: '25.9',
            degTarget: '0.0',
            power: '0',
          });
          expect(hotend).toEqual({});
          expect(wait).toEqual(undefined);
          resolve();
        });

        const line = 'ok T:293.0 /0.0 B:25.9 /0.0 @:0 B@:0';
        runner.parse(line);
      });
    });

    test('ok T:293.0 /0.0 B:25.9 /0.0 T0:293.0 /0.0 T1:100.0 /0.0 @:0 B@:0 @0:0 @1:0', () => {
      return new Promise((resolve) => {
        const runner = new MarlinRunner();
        runner.on('temperature', ({ raw, ok, extruder, heatedBed, hotend, wait }) => {
          expect(raw).toEqual('ok T:293.0 /0.0 B:25.9 /0.0 T0:293.0 /0.0 T1:100.0 /0.0 @:0 B@:0 @0:0 @1:0');
          expect(ok).toEqual(true);
          expect(extruder).toEqual({
            deg: '293.0',
            degTarget: '0.0',
            power: '0',
          });
          expect(heatedBed).toEqual({
            deg: '25.9',
            degTarget: '0.0',
            power: '0',
          });
          expect(hotend).toEqual({
            T0: {
              deg: '293.0',
              degTarget: '0.0',
              power: '0',
            },
            T1: {
              deg: '100.0',
              degTarget: '0.0',
              power: '0',
            },
          });
          expect(wait).toEqual(undefined);
          resolve();
        });

        const line = 'ok T:293.0 /0.0 B:25.9 /0.0 T0:293.0 /0.0 T1:100.0 /0.0 @:0 B@:0 @0:0 @1:0';
        runner.parse(line);
      });
    });

    test('ok T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0', () => {
      return new Promise((resolve) => {
        const runner = new MarlinRunner();
        runner.on('temperature', ({ raw, ok, extruder, heatedBed, hotend, wait }) => {
          expect(raw).toEqual('ok T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0');
          expect(ok).toEqual(true);
          expect(extruder).toEqual({
            deg: '293.0',
            degTarget: '0.0',
            power: '0',
          });
          expect(heatedBed).toEqual({
            deg: '25.9',
            degTarget: '0.0',
            power: '0',
          });
          expect(hotend).toEqual({
            T0: {
              deg: '293.0',
              degTarget: '0.0',
              power: '0',
            },
            T1: {
              deg: '100.0',
              degTarget: '0.0',
              power: '0',
            },
          });
          expect(wait).toEqual(undefined);
          resolve();
        });

        const line = 'ok T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0';
        runner.parse(line);
      });
    });

    test('ok T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0 W:?', () => {
      return new Promise((resolve) => {
        const runner = new MarlinRunner();
        runner.on('temperature', ({ raw, ok, extruder, heatedBed, hotend, wait }) => {
          expect(raw).toEqual('ok T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0 W:?');
          expect(ok).toEqual(true);
          expect(extruder).toEqual({
            deg: '293.0',
            degTarget: '0.0',
            power: '0',
          });
          expect(heatedBed).toEqual({
            deg: '25.9',
            degTarget: '0.0',
            power: '0',
          });
          expect(hotend).toEqual({
            T0: {
              deg: '293.0',
              degTarget: '0.0',
              power: '0',
            },
            T1: {
              deg: '100.0',
              degTarget: '0.0',
              power: '0',
            },
          });
          expect(wait).toEqual('?');
          resolve();
        });

        const line = 'ok T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0 W:?';
        runner.parse(line);
      });
    });

    test('ok T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0 W:0', () => {
      return new Promise((resolve) => {
        const runner = new MarlinRunner();
        runner.on('temperature', ({ raw, ok, extruder, heatedBed, hotend, wait }) => {
          expect(raw).toEqual('ok T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0 W:0');
          expect(ok).toEqual(true);
          expect(extruder).toEqual({
            deg: '293.0',
            degTarget: '0.0',
            power: '0',
          });
          expect(heatedBed).toEqual({
            deg: '25.9',
            degTarget: '0.0',
            power: '0',
          });
          expect(hotend).toEqual({
            T0: {
              deg: '293.0',
              degTarget: '0.0',
              power: '0',
            },
            T1: {
              deg: '100.0',
              degTarget: '0.0',
              power: '0',
            },
          });
          expect(wait).toEqual('0');
          resolve();
        });

        const line = 'ok T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0 W:0';
        runner.parse(line);
      });
    });

    test('ok L:21.84 /0.00 @:0 C@:0', () => {
      return new Promise((resolve) => {
        const runner = new MarlinRunner();
        runner.on('temperature', ({ raw, ok, extruder, cooler }) => {
          expect(raw).toEqual('ok L:21.84 /0.00 @:0 C@:0');
          expect(ok).toEqual(true);
          expect(extruder).toEqual({
            power: '0',
          });
          expect(cooler).toEqual({
            deg: '21.84',
            degTarget: '0.00',
            power: '0',
          });
          resolve();
        });

        const line = 'ok L:21.84 /0.00 @:0 C@:0';
        runner.parse(line);
      });
    });

    test('ok C:25.9 /0.00 L:21.84 /0.00 @:0 C@:127 C@:0', () => {
      return new Promise((resolve) => {
        const runner = new MarlinRunner();
        runner.on('temperature', ({ raw, ok, extruder, heatedChamber, cooler }) => {
          expect(raw).toEqual('ok C:25.9 /0.00 L:21.84 /0.00 @:0 C@:127 C@:0');
          expect(ok).toEqual(true);
          expect(extruder).toEqual({
            power: '0',
          });
          expect(heatedChamber).toEqual({
            deg: '25.9',
            degTarget: '0.00',
            power: '127',
          });
          expect(cooler).toEqual({
            deg: '21.84',
            degTarget: '0.00',
            power: '0',
          });
          resolve();
        });

        const line = 'ok C:25.9 /0.00 L:21.84 /0.00 @:0 C@:127 C@:0';
        runner.parse(line);
      });
    });

    test(' T:293.0 /0.0 B:25.9 /0.0 @:0 B@:0', () => {
      return new Promise((resolve) => {
        const runner = new MarlinRunner();
        runner.on('temperature', ({ raw, ok, extruder, heatedBed, hotend, wait }) => {
          expect(raw).toEqual(' T:293.0 /0.0 B:25.9 /0.0 @:0 B@:0');
          expect(ok).toEqual(false);
          expect(extruder).toEqual({
            deg: '293.0',
            degTarget: '0.0',
            power: '0',
          });
          expect(heatedBed).toEqual({
            deg: '25.9',
            degTarget: '0.0',
            power: '0',
          });
          expect(hotend).toEqual({});
          expect(wait).toEqual(undefined);
          resolve();
        });

        const line = ' T:293.0 /0.0 B:25.9 /0.0 @:0 B@:0';
        runner.parse(line);
      });
    });

    test(' T:293.0 /0.0 B:25.9 /0.0 T0:293.0 /0.0 T1:100.0 /0.0 @:0 B@:0 @0:0 @1:0', () => {
      return new Promise((resolve) => {
        const runner = new MarlinRunner();
        runner.on('temperature', ({ raw, ok, extruder, heatedBed, hotend, wait }) => {
          expect(raw).toEqual(' T:293.0 /0.0 B:25.9 /0.0 T0:293.0 /0.0 T1:100.0 /0.0 @:0 B@:0 @0:0 @1:0');
          expect(ok).toEqual(false);
          expect(extruder).toEqual({
            deg: '293.0',
            degTarget: '0.0',
            power: '0',
          });
          expect(heatedBed).toEqual({
            deg: '25.9',
            degTarget: '0.0',
            power: '0',
          });
          expect(hotend).toEqual({
            T0: {
              deg: '293.0',
              degTarget: '0.0',
              power: '0',
            },
            T1: {
              deg: '100.0',
              degTarget: '0.0',
              power: '0',
            },
          });
          expect(wait).toEqual(undefined);
          resolve();
        });

        const line = ' T:293.0 /0.0 B:25.9 /0.0 T0:293.0 /0.0 T1:100.0 /0.0 @:0 B@:0 @0:0 @1:0';
        runner.parse(line);
      });
    });

    test(' T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0', () => {
      return new Promise((resolve) => {
        const runner = new MarlinRunner();
        runner.on('temperature', ({ raw, ok, extruder, heatedBed, hotend, wait }) => {
          expect(raw).toEqual(' T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0');
          expect(ok).toEqual(false);
          expect(extruder).toEqual({
            deg: '293.0',
            degTarget: '0.0',
            power: '0',
          });
          expect(heatedBed).toEqual({
            deg: '25.9',
            degTarget: '0.0',
            power: '0',
          });
          expect(hotend).toEqual({
            T0: {
              deg: '293.0',
              degTarget: '0.0',
              power: '0',
            },
            T1: {
              deg: '100.0',
              degTarget: '0.0',
              power: '0',
            },
          });
          expect(wait).toEqual(undefined);
          resolve();
        });

        const line = ' T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0';
        runner.parse(line);
      });
    });

    test('ok T0:27.58 /0.00 B:28.27 /0.00 T0:27.58 /0.00 T1:27.37 /0.00 @:0 B@:0 @0:0 @1:0', () => {
      return new Promise((resolve) => {
        const runner = new MarlinRunner();
        runner.on('temperature', ({ raw, ok, extruder, heatedBed, hotend, wait }) => {
          expect(raw).toEqual('ok T0:27.58 /0.00 B:28.27 /0.00 T0:27.58 /0.00 T1:27.37 /0.00 @:0 B@:0 @0:0 @1:0');
          expect(ok).toEqual(true);
          expect(extruder).toEqual({
            deg: '27.58',
            degTarget: '0.00',
            power: '0',
          });
          expect(heatedBed).toEqual({
            deg: '28.27',
            degTarget: '0.00',
            power: '0',
          });
          expect(hotend).toEqual({
            T0: {
              deg: '27.58',
              degTarget: '0.00',
              power: '0',
            },
            T1: {
              deg: '27.37',
              degTarget: '0.00',
              power: '0',
            },
          });
          expect(wait).toEqual(undefined);
          resolve();
        });

        const line = 'ok T0:27.58 /0.00 B:28.27 /0.00 T0:27.58 /0.00 T1:27.37 /0.00 @:0 B@:0 @0:0 @1:0';
        runner.parse(line);
      });
    });

    // T0 is the active extruder
    test(' T0:27.72 /0.00 B:28.38 /0.00 T0:27.72 /0.00 T1:27.28 /0.00 @:0 B@:0 @0:0 @1:0', () => {
      return new Promise((resolve) => {
        const runner = new MarlinRunner();
        runner.on('temperature', ({ raw, ok, extruder, heatedBed, hotend, wait }) => {
          expect(raw).toEqual(' T0:27.72 /0.00 B:28.38 /0.00 T0:27.72 /0.00 T1:27.28 /0.00 @:0 B@:0 @0:0 @1:0');
          expect(ok).toEqual(false);
          expect(extruder).toEqual({
            deg: '27.72',
            degTarget: '0.00',
            power: '0',
          });
          expect(heatedBed).toEqual({
            deg: '28.38',
            degTarget: '0.00',
            power: '0',
          });
          expect(hotend).toEqual({
            T0: {
              deg: '27.72',
              degTarget: '0.00',
              power: '0',
            },
            T1: {
              deg: '27.28',
              degTarget: '0.00',
              power: '0',
            },
          });
          expect(wait).toEqual(undefined);
          resolve();
        });

        const line = ' T0:27.72 /0.00 B:28.38 /0.00 T0:27.72 /0.00 T1:27.28 /0.00 @:0 B@:0 @0:0 @1:0';
        runner.parse(line);
      });
    });

    // T1 is the active extruder
    test(' T0:27.28 /0.00 B:28.38 /0.00 T0:27.72 /0.00 T1:27.28 /0.00 @:0 B@:0 @0:0 @1:0', () => {
      return new Promise((resolve) => {
        const runner = new MarlinRunner();
        runner.on('temperature', ({ raw, ok, extruder, heatedBed, hotend, wait }) => {
          expect(raw).toEqual(' T0:27.28 /0.00 B:28.38 /0.00 T0:27.72 /0.00 T1:27.28 /0.00 @:0 B@:0 @0:0 @1:0');
          expect(ok).toEqual(false);
          expect(extruder).toEqual({
            deg: '27.28',
            degTarget: '0.00',
            power: '0',
          });
          expect(heatedBed).toEqual({
            deg: '28.38',
            degTarget: '0.00',
            power: '0',
          });
          expect(hotend).toEqual({
            T0: {
              deg: '27.72',
              degTarget: '0.00',
              power: '0',
            },
            T1: {
              deg: '27.28',
              degTarget: '0.00',
              power: '0',
            },
          });
          expect(wait).toEqual(undefined);
          resolve();
        });

        const line = ' T0:27.28 /0.00 B:28.38 /0.00 T0:27.72 /0.00 T1:27.28 /0.00 @:0 B@:0 @0:0 @1:0';
        runner.parse(line);
      });
    });
  });
});
