/* eslint-env jest */
import { mergePorts } from '../CNCEngine';

describe('mergePorts', () => {
  test('returns an empty list when neither source has ports', () => {
    expect(mergePorts([], [])).toEqual([]);
  });

  test('preserves detected-only and configured-only entries', () => {
    const detectedPort = { path: '/dev/ttyUSB0', manufacturer: 'Detected' };
    const configuredPort = { path: '/dev/ttyUSB1', manufacturer: 'Configured' };
    const ports = mergePorts([detectedPort], [configuredPort]);

    expect(ports).toEqual([detectedPort, configuredPort]);
    expect(ports[0]).toBe(detectedPort);
    expect(ports[1]).toBe(configuredPort);
  });

  test('overlays configured metadata without mutating either source', () => {
    const detectedPort = Object.freeze({
      path: '/dev/ttyUSB0', manufacturer: 'Detected', serialNumber: '123'
    });
    const configuredPort = Object.freeze({ path: '/dev/ttyUSB0', manufacturer: 'Configured' });

    expect(mergePorts(Object.freeze([detectedPort]), Object.freeze([configuredPort]))).toEqual([
      { path: '/dev/ttyUSB0', manufacturer: 'Configured', serialNumber: '123' }
    ]);
  });

  test('replaces detected duplicates with the last entry at the first path position', () => {
    const firstPort = { path: '/dev/ttyUSB0', manufacturer: 'First', serialNumber: '123' };
    const otherPort = { path: '/dev/ttyUSB1' };
    const lastPort = { path: '/dev/ttyUSB0', manufacturer: 'Last' };
    const ports = mergePorts([firstPort, otherPort, lastPort], []);

    expect(ports).toEqual([lastPort, otherPort]);
    expect(ports[0]).toBe(lastPort);
  });

  test('merges configured duplicates in sequence without changing path order', () => {
    const detectedPorts = [{ path: '/dev/ttyUSB0', manufacturer: 'Detected' }, { path: '/dev/ttyUSB1' }];
    const configuredPorts = [
      { path: '/dev/ttyUSB2', manufacturer: 'Configured', serialNumber: '123' },
      { path: '/dev/ttyUSB0', manufacturer: 'Override' },
      { path: '/dev/ttyUSB3' },
      { path: '/dev/ttyUSB2', manufacturer: 'Last' }
    ];

    expect(mergePorts(detectedPorts, configuredPorts)).toEqual([
      { path: '/dev/ttyUSB0', manufacturer: 'Override' },
      { path: '/dev/ttyUSB1' },
      { path: '/dev/ttyUSB2', manufacturer: 'Last', serialNumber: '123' },
      { path: '/dev/ttyUSB3' }
    ]);
  });

  test('allows explicit undefined and empty metadata to override detected values', () => {
    expect(mergePorts(
      [{ path: '/dev/ttyUSB0', manufacturer: 'Detected', serialNumber: '123' }],
      [{ path: '/dev/ttyUSB0', manufacturer: undefined, serialNumber: '' }]
    )).toEqual([{ path: '/dev/ttyUSB0', manufacturer: undefined, serialNumber: '' }]);
  });
});
