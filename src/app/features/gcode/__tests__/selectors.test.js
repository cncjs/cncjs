import {
  NO_READING,
  dimensionRows,
  formatCount,
  formatDuration,
  formatTimestamp,
  jobProgress,
} from '../selectors';

const METRIC = 'mm';
const IMPERIAL = 'in';

describe('jobProgress', () => {
  it('is driven by received, not sent', () => {
    // The whole reason this function exists. `sent` counts lines handed to the
    // controller, which runs seconds behind while its planner buffer drains.
    // A bar driven by it reaches 100% with the tool still cutting.
    const status = { sent: 1000, received: 500, total: 1000 };

    expect(jobProgress(status)).toBe(50);
  });

  it('is zero before anything is loaded', () => {
    expect(jobProgress({ received: 0, total: 0 })).toBe(0);
    expect(jobProgress()).toBe(0);
  });

  it('never exceeds a hundred', () => {
    // The controller can acknowledge more lines than the sender counted when a
    // job is restarted, and a bar wider than its track is a rendering bug.
    expect(jobProgress({ received: 1200, total: 1000 })).toBe(100);
  });

  it('rounds to whole percent', () => {
    expect(jobProgress({ received: 1, total: 3 })).toBe(33);
    expect(jobProgress({ received: 2, total: 3 })).toBe(67);
  });
});

describe('formatCount', () => {
  it('reads as done out of total', () => {
    expect(formatCount(4812, 11430)).toBe('4812 / 11430');
  });

  it('says nothing when there is no job', () => {
    expect(formatCount(0, 0)).toBe(NO_READING);
  });
});

describe('formatDuration', () => {
  it('pads every field to two digits', () => {
    // Fixed width is the point: a clock whose fields change width jumps
    // sideways every time it ticks past nine.
    expect(formatDuration(((1 * 60) + 2) * 1000 + 3000)).toBe('00:01:05');
    expect(formatDuration(9 * 1000)).toBe('00:00:09');
  });

  it('counts past a full day rather than wrapping', () => {
    expect(formatDuration(25 * 3600 * 1000)).toBe('25:00:00');
  });

  it('says nothing for a span that has not happened', () => {
    expect(formatDuration(0)).toBe(NO_READING);
    expect(formatDuration(-1)).toBe(NO_READING);
    expect(formatDuration(undefined)).toBe(NO_READING);
  });
});

describe('formatTimestamp', () => {
  it('says nothing for a time that has not arrived', () => {
    expect(formatTimestamp(0)).toBe(NO_READING);
    expect(formatTimestamp(undefined)).toBe(NO_READING);
  });

  it('renders a real time as a date and a clock', () => {
    expect(formatTimestamp(1600000000000)).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});

describe('dimensionRows', () => {
  const bbox = {
    min: { x: 10, y: -5, z: -3 },
    max: { x: 70, y: 50, z: 5 },
  };

  it('gives one row per axis, named', () => {
    expect(dimensionRows(bbox, METRIC).map((row) => row[0])).toEqual(['X', 'Y', 'Z']);
  });

  it('derives the span from the two figures beside it', () => {
    const [x, y, z] = dimensionRows(bbox, METRIC);

    expect(x.slice(1)).toEqual(['10.000', '70.000', '60.000']);
    expect(y.slice(1)).toEqual(['-5.000', '50.000', '55.000']);
    expect(z.slice(1)).toEqual(['-3.000', '5.000', '8.000']);
  });

  it('pads to a fixed number of decimals so a column lines up', () => {
    const rows = dimensionRows({ min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } }, METRIC);

    for (const row of rows) {
      expect(row.slice(1)).toEqual(['0.000', '0.000', '0.000']);
    }
  });

  it('converts to inches when the controller is in imperial', () => {
    const [x] = dimensionRows({ min: { x: 0, y: 0, z: 0 }, max: { x: 25.4, y: 0, z: 0 } }, IMPERIAL);

    // Four decimals in imperial, because a thousandth of an inch is coarser
    // than a hundredth of a millimetre and machinists work to tenths.
    expect(x.slice(1)).toEqual(['0.0000', '1.0000', '1.0000']);
  });

  it('treats a missing figure as zero rather than NaN', () => {
    const [x] = dimensionRows({ min: {}, max: {} }, METRIC);

    expect(x.slice(1)).toEqual(['0.000', '0.000', '0.000']);
  });
});
