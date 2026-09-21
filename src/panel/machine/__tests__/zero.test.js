import controller from '../controller';
import { zeroLine, zero, activeWcsNumber } from '../zero';

jest.mock('../controller', () => ({ command: jest.fn() }));

describe('zeroLine', () => {
  test('zeroes the coordinate system the machine is actually working in', () => {
    // Not a hard-coded P1. Zeroing G54 while the job runs in G55 is silent,
    // and it is discovered by a tool moving to the wrong place under power.
    expect(zeroLine({ modal: { wcs: 'G55' }, axes: ['z'] })).toBe('G10 L20 P2 Z0');
    expect(zeroLine({ modal: { wcs: 'G59' }, axes: ['x', 'y'] })).toBe('G10 L20 P6 X0 Y0');
  });

  test('refuses rather than guesses when the system is unknown', () => {
    expect(zeroLine({ modal: {}, axes: ['z'] })).toBeNull();
    expect(zeroLine({ modal: { wcs: 'G92' }, axes: ['z'] })).toBeNull();
    expect(activeWcsNumber({})).toBe(0);
  });

  test('refuses an empty set of axes', () => {
    expect(zeroLine({ modal: { wcs: 'G54' }, axes: [] })).toBeNull();
  });
});

describe('zero', () => {
  beforeEach(() => controller.command.mockClear());

  test('sends nothing at all when it would have to guess', () => {
    // The trap: a command that quietly falls back to P1 looks like it worked.
    zero({ modal: {}, axes: ['z'] });
    expect(controller.command).not.toHaveBeenCalled();
  });

  test('sends one line, and it moves nothing', () => {
    // `G10 L20` rewrites the offset between machine and work coordinates. No
    // axis moves, which is why this is safe to wire before homing is.
    zero({ modal: { wcs: 'G54' }, axes: ['x', 'y'] });
    expect(controller.command).toHaveBeenCalledTimes(1);
    expect(controller.command).toHaveBeenCalledWith('gcode', 'G10 L20 P1 X0 Y0');
  });
});
