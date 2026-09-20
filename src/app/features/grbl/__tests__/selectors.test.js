import { NO_READING } from '../../../lib/reading';
import {
  bufferPercent,
  hasOverrides,
  machineState,
  modalReadings,
  overridePercents,
  queueBuffers,
  statusReadings,
  stateTone,
} from '../selectors';

describe('stateTone', () => {
  // The mapping is a judgement, so it is asserted rather than left to whoever
  // reads the colour off the screen and assumes it was meant.
  test.each([
    ['Run', 'running'],
    ['Jog', 'running'],
    ['Home', 'running'],
    ['Idle', 'ready'],
    ['Hold', 'ready'],
    ['Alarm', 'stopped'],
    ['Door', 'stopped'],
    ['Check', 'inactive'],
    ['Sleep', 'inactive'],
  ])('shows %s as %s', (state, tone) => {
    expect(stateTone(state)).toBe(tone);
  });

  test('a state nobody planned for gets no colour rather than the last one', () => {
    // A firmware fork adding a state must not inherit whichever tone happens
    // to sit first in the table.
    expect(stateTone('Reconfiguring')).toBe('inactive');
    expect(stateTone(undefined)).toBe('inactive');
  });
});

describe('machineState', () => {
  test('is the word the controller reported', () => {
    expect(machineState({ activeState: 'Hold' })).toBe('Hold');
  });

  test('is a dash when nothing has been reported', () => {
    expect(machineState({})).toBe(NO_READING);
    expect(machineState()).toBe(NO_READING);
  });
});

describe('statusReadings', () => {
  test('prefers what the machine is doing to what it was last told', () => {
    const readings = statusReadings(
      { feedrate: 480, spindle: 12000 },
      { feedrate: '1200', spindle: '24000', tool: '3' },
    );
    expect(readings).toEqual({ feedrate: 480, spindle: 12000, tool: '3' });
  });

  test('keeps a reported zero instead of falling through to the parser', () => {
    // The regression this guards is the whole reason the fallback is written
    // out rather than left to `||`: an idle machine reports 0, and 0 is a
    // reading. Falling through would show the feed rate of the last job on a
    // machine that is standing still.
    const readings = statusReadings({ feedrate: 0, spindle: 0 }, { feedrate: '1200', spindle: '24000' });
    expect(readings.feedrate).toBe(0);
    expect(readings.spindle).toBe(0);
  });

  test('falls through to the parser when the status line carries neither', () => {
    const readings = statusReadings({}, { feedrate: '1200', spindle: '24000' });
    expect(readings).toEqual({ feedrate: '1200', spindle: '24000', tool: NO_READING });
  });

  test('is all dashes with nothing connected', () => {
    expect(statusReadings()).toEqual({
      feedrate: NO_READING,
      spindle: NO_READING,
      tool: NO_READING,
    });
  });
});

/**
 * The English is not asserted here, and that is deliberate rather than lazy.
 *
 * `mapGCodeToText` reads its strings through i18n, and jest runs in node with
 * i18n never initialised, so every lookup comes back as the bare code. A test
 * expecting "Rapid Move (G0)" here would be testing the harness. That the
 * words appear at all is the hardware tier's job, in a browser with the
 * translations loaded; what is left for this file is the part that is this
 * module's own — that the code survives translation, and what happens when
 * the controller says nothing.
 */
describe('modalReadings', () => {
  test('never loses the code it was given', () => {
    const readings = modalReadings({ motion: 'G0', wcs: 'G54', units: 'G21' });
    expect(readings.motion).toContain('G0');
    expect(readings.wcs).toContain('G54');
    expect(readings.units).toContain('G21');
  });

  test('says nothing for a group the controller did not report', () => {
    // Grbl 1.1 never reports a program modal group, so this is the everyday
    // case rather than an edge one.
    expect(modalReadings({ motion: 'G0' }).program).toBe(NO_READING);
    expect(modalReadings().coolant).toBe(NO_READING);
  });

  test('keeps both coolants when both are on', () => {
    // Mist and flood can run together, and a panel that showed one of them
    // would be telling an operator the other is off.
    expect(modalReadings({ coolant: ['M7', 'M8'] }).coolant).toMatch(/M7.*,.*M8/);
  });
});

describe('overridePercents', () => {
  test('unpacks Ov as feed, rapid, spindle', () => {
    // Not the order the panel draws them in. Getting this wrong pairs the
    // spindle figure with the rapid buttons and looks entirely plausible.
    expect(overridePercents({ ov: [90, 50, 110] }))
      .toEqual({ feed: 90, rapid: 50, spindle: 110 });
  });

  test('is all zeroes when the controller sent no Ov at all', () => {
    expect(overridePercents({})).toEqual({ feed: 0, rapid: 0, spindle: 0 });
    expect(hasOverrides({})).toBe(false);
    expect(hasOverrides({ ov: [100, 100, 100] })).toBe(true);
  });
});

describe('queueBuffers', () => {
  test('is nothing at all when the controller did not report buffers', () => {
    // Distinct from reporting empty buffers. `$10` bit 1 is off in a default
    // build, so this is what a stock Grbl does.
    expect(queueBuffers({})).toBeNull();
    expect(queueBuffers({ buf: { planner: 0, rx: 0 } })).not.toBeNull();
  });

  test('remembers the deepest the planner has been seen to go', () => {
    // Grbl never states its planner depth, so the scale is learned by
    // watching. A maximum that dropped back would make the bar jump.
    const first = queueBuffers({ buf: { planner: 12, rx: 100 } }, { planner: 0, rx: 128 });
    expect(first.plannerMax).toBe(12);

    const shallower = queueBuffers({ buf: { planner: 3, rx: 100 } }, first);
    expect(shallower.planner).toBe(3);
    expect(shallower.plannerMax).toBe(12);
  });
});

describe('bufferPercent', () => {
  test('is zero before anything is known about the scale', () => {
    expect(bufferPercent(0, 0)).toBe(0);
    expect(bufferPercent(5, 0)).toBe(0);
  });

  test('never exceeds full', () => {
    expect(bufferPercent(9, 12)).toBe(75);
    expect(bufferPercent(20, 12)).toBe(100);
  });
});
