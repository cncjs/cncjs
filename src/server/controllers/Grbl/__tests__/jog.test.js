import {
  LEAD_CEILING_SECONDS, LEAD_FLOOR_SECONDS, MAX_IN_FLIGHT, SEGMENT_SECONDS, jogSegmentLine,
  leadSecondsFor, roomFor, segmentDistance, stopSeconds,
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

  test('sizes the lead from what this host delivers, not from a guess', () => {
    /*
     * The N half, and it is not a constant because it is not a property of
     * the machine — it is a property of the computer the server runs on.
     * Twice the worst observed tick: one interval covers the tick that is
     * late, the next keeps the machine moving while it is served.
     */
    expect(leadSecondsFor(0.02)).toBeCloseTo(0.04, 9);
    expect(leadSecondsFor(0.03)).toBeCloseTo(0.06, 9);
  });

  test('never queues a full planner, however bad the host is', () => {
    /*
     * Grbl holds fifteen blocks, and a loop paced only by acknowledgements
     * fills all fifteen — a 150ms stop, because everything queued is paid
     * for before a cancel can take effect. Even the ceiling stays well under
     * that.
     */
    expect(LEAD_CEILING_SECONDS).toBeLessThan(SEGMENT_SECONDS * 15);
    expect(leadSecondsFor(10)).toBe(LEAD_CEILING_SECONDS);
  });

  test('a host that was never measured gets the safe value, not zero', () => {
    // Unmeasured is not the same as fast.
    expect(leadSecondsFor(undefined)).toBe(LEAD_FLOOR_SECONDS);
    expect(leadSecondsFor(0)).toBe(LEAD_FLOOR_SECONDS);
    expect(leadSecondsFor(-1)).toBe(LEAD_FLOOR_SECONDS);
  });

  test('the floor covers the serial adapter, not just the computer', () => {
    // A USB serial adapter's latency timer defaults to 16ms on Windows;
    // a lead under that is one the cable takes back.
    expect(LEAD_FLOOR_SECONDS * 1000).toBeGreaterThanOrEqual(16);
  });

  test('stopping time is the lead plus the reply from the firmware', () => {
    /*
     * Both have to be paid before deceleration can even start: the queue has
     * to run out, and the last segment has to be acknowledged, because
     * `0x85` cannot empty the firmware's receive buffer.
     */
    expect(stopSeconds({ leadSeconds: 0.03, ackSeconds: 0.016 })).toBeCloseTo(0.046, 9);
    expect(stopSeconds({ leadSeconds: 0.03 })).toBeCloseTo(0.03, 9);
  });

  test('stops sending before the backlog gets long enough to sit behind', () => {
    expect(SEGMENT_SECONDS * MAX_IN_FLIGHT).toBeLessThan(0.1);
    expect(SEGMENT_SECONDS * MAX_IN_FLIGHT).toBeGreaterThanOrEqual(LEAD_CEILING_SECONDS);
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
    const reach = segmentDistance(1500) / Math.sqrt(2);
    expect(line({ x: 1, y: -1 })).toBe(`$J=G91 G21 X${reach} Y${-reach} F1500`);
  });

  test('a diagonal segment lasts as long as a straight one', () => {
    /*
     * The machine holds the *resultant* to the feed rate, so equal distance
     * on both axes is a move that lasts √2 ticks. Sent every tick, that is a
     * queue that grows for as long as the key is held — measured on the
     * machine, a held diagonal travelled 1.45x its due distance and took
     * 819ms to stop, against 288ms for the same hold along one axis.
     */
    const straight = Number(line({ x: 1 }).match(/X(-?[\d.]+)/)[1]);
    const [, dx, dy] = line({ x: 1, y: 1 }).match(/X(-?[\d.]+) Y(-?[\d.]+)/);

    expect(Math.hypot(Number(dx), Number(dy))).toBeCloseTo(straight, 9);
  });

  test('a three-axis move lasts as long too', () => {
    const straight = Number(line({ x: 1 }).match(/X(-?[\d.]+)/)[1]);
    const [, dx, dy, dz] = line({ x: 1, y: 1, z: 1 }).match(/X(-?[\d.]+) Y(-?[\d.]+) Z(-?[\d.]+)/);

    expect(Math.hypot(Number(dx), Number(dy), Number(dz))).toBeCloseTo(straight, 9);
  });

  test('is cut to the axis with the least room, on every axis', () => {
    // A tenth of a millimetre from the Y end — tighter than a whole segment,
    // which at 1500mm/min is 0.25mm. Both axes get the tenth, so the move
    // still goes where it was aimed instead of bending when Y ran out.
    expect(line({ x: 1, y: 1 }, { ...MIDDLE, y: '-0.1' })).toBe('$J=G91 G21 X0.1 Y0.1 F1500');
  });

  test('is a whole segment when the room is wider than one', () => {
    // The room only bites when it is the smaller of the two.
    const reach = segmentDistance(1500) / Math.sqrt(2);
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
