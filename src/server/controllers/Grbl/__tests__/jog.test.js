import {
  LEAD_SEGMENTS, MAX_IN_FLIGHT, SEGMENT_SECONDS, jogSegmentLine, roomFor, segmentDistance,
} from '../jog';

// A Grbl that homes to the maximum: travel is [-range, 0].
const HOMES_TO_MAX = { $130: '1000', $131: '700', $132: '150', $23: '0' };
// The Z bit set in `$23`: that axis homes at the bottom, travel is [0, range].
const Z_HOMES_TO_MIN = { ...HOMES_TO_MAX, $23: '4' };
const MIDDLE = { x: '-500', y: '-350', z: '-75' };

describe('how long a segment is', () => {
  test('is the travel the feed rate covers in the segment time', () => {
    // The document's own arithmetic: s = v * dt.
    expect(segmentDistance(1500)).toBeCloseTo((1500 / 60) * SEGMENT_SECONDS, 9);
  });

  test('covers the time that actually passed, not the time asked for', () => {
    /*
     * `setInterval(…, 10)` delivers about 15ms on Windows. Sizing segments
     * at 10ms regardless meant a 1500 mm/min jog held for 1.2s travelled
     * 20mm instead of 30 — the feed rate quietly became two thirds of what
     * was asked for.
     */
    expect(segmentDistance(1500, 0.015)).toBeCloseTo((1500 / 60) * 0.015, 9);
    expect(segmentDistance(1500, 0.015)).toBeGreaterThan(segmentDistance(1500));
  });

  test('a late tick makes a longer segment, not a slower machine', () => {
    const feedrate = 1500;
    const late = 0.015;
    const line = jogSegmentLine({
      dir: { x: 1 },
      feedrate,
      seconds: late,
      settings: HOMES_TO_MAX,
      mpos: MIDDLE,
    });
    expect(line).toBe(`$J=G91 G21 X${(feedrate / 60) * late} F${feedrate}`);
  });
  test('is the floor the documentation gives, and short on purpose', () => {
    /*
     * A turn, and a stop, cost `dt * N` — one segment's length times how
     * many are queued ahead of it. This is the `dt` half of keeping that
     * product small.
     *
     * The opposite was tried first — long segments with the queue held short
     * by watching `Bf:` — and at 0.1s a turn was still not visible after
     * 900ms.
     */
    expect(SEGMENT_SECONDS).toBe(0.01);
  });

  test('queues a short lead, not a full planner', () => {
    /*
     * The N half. Grbl holds fifteen blocks, and a loop paced only by
     * acknowledgements fills all fifteen — which is a 150ms stop, because
     * everything queued is paid for before a cancel can take effect.
     */
    expect(LEAD_SEGMENTS).toBeLessThan(15);
    expect(SEGMENT_SECONDS * LEAD_SEGMENTS).toBeLessThanOrEqual(0.05);
  });

  test('leaves enough in hand to cover a late tick', () => {
    // Jitter on this loop measured 8-13ms; the lead has to outlast it.
    expect(SEGMENT_SECONDS * LEAD_SEGMENTS * 1000).toBeGreaterThan(13);
  });

  test('stops sending before the backlog gets long enough to sit behind', () => {
    expect(MAX_IN_FLIGHT).toBeGreaterThan(LEAD_SEGMENTS);
    expect(SEGMENT_SECONDS * MAX_IN_FLIGHT).toBeLessThan(0.1);
  });
});

describe('how much room is left', () => {
  test('measures towards the end being driven at', () => {
    expect(roomFor('x', 1, HOMES_TO_MAX, MIDDLE)).toBe(500);
    expect(roomFor('x', -1, HOMES_TO_MAX, MIDDLE)).toBe(500);
    expect(roomFor('z', 1, HOMES_TO_MAX, MIDDLE)).toBe(75);
  });

  test('follows `$23` to the other end of the axis', () => {
    // With the bit set the volume is [0, range], so a tool at -75 is outside
    // it and driving further negative has nothing left.
    expect(roomFor('z', 1, Z_HOMES_TO_MIN, { ...MIDDLE, z: '75' })).toBe(75);
    expect(roomFor('z', -1, Z_HOMES_TO_MIN, { ...MIDDLE, z: '75' })).toBe(75);
  });

  test('is null when the machine has not said how far it goes or where it is', () => {
    expect(roomFor('x', 1, {}, MIDDLE)).toBeNull();
    expect(roomFor('x', 1, HOMES_TO_MAX, {})).toBeNull();
  });
});

describe('the line for one segment', () => {
  const line = (dir, mpos = MIDDLE, feedrate = 1500) => jogSegmentLine({
    dir, feedrate, settings: HOMES_TO_MAX, mpos,
  });

  test('is a relative jog in millimetres, carrying the feed rate', () => {
    const reach = segmentDistance(1500);
    expect(line({ x: 1 })).toBe(`$J=G91 G21 X${reach} F1500`);
  });

  test('names the axes in X, Y, Z order however the caller ordered them', () => {
    expect(line({ y: -1, x: 1 })).toContain('X');
    expect(line({ y: -1, x: 1 }).indexOf('X')).toBeLessThan(line({ y: -1, x: 1 }).indexOf('Y'));
  });

  test('keeps a diagonal at 45 degrees', () => {
    const reach = segmentDistance(1500);
    expect(line({ x: 1, y: -1 })).toBe(`$J=G91 G21 X${reach} Y${-reach} F1500`);
  });

  test('is cut to the axis with the least room, on every axis', () => {
    // A tenth of a millimetre from the Y end — tighter than a whole segment,
    // which at 1500mm/min is 0.25mm. Both axes get the tenth, so the move
    // still goes where it was aimed instead of bending when Y ran out.
    expect(line({ x: 1, y: 1 }, { ...MIDDLE, y: '-0.1' })).toBe('$J=G91 G21 X0.1 Y0.1 F1500');
  });

  test('is a whole segment when the room is wider than one', () => {
    // The room only bites when it is the smaller of the two.
    const reach = segmentDistance(1500);
    expect(line({ x: 1, y: 1 }, { ...MIDDLE, y: '-50' }))
      .toBe(`$J=G91 G21 X${reach} Y${reach} F1500`);
  });

  test('is null once the axis has run out', () => {
    // The loop reads this as "stop sending" rather than filling the
    // controller with lines it will refuse.
    expect(line({ x: 1 }, { ...MIDDLE, x: '0' })).toBeNull();
  });

  test('is null without a direction or a feed rate', () => {
    expect(line({})).toBeNull();
    expect(line({ x: 1 }, MIDDLE, 0)).toBeNull();
  });

  test('sends the segment as asked when there is no boundary to measure', () => {
    const reach = segmentDistance(1500);
    expect(jogSegmentLine({ dir: { x: 1 }, feedrate: 1500, settings: {}, mpos: MIDDLE }))
      .toBe(`$J=G91 G21 X${reach} F1500`);
  });
});
