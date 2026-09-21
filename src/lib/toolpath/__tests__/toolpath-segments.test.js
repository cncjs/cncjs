import buildToolpath from '../toolpath-geometry';
import buildSegments, {
  CUT_DEEP,
  CUT_SHALLOW,
  RAPID_COLOR,
  completedCount,
  depthColor,
} from '../toolpath-segments';

const segmentCount = (set) => set.vertexIndex.length;

const endpointColor = (set, segment, end) => ({
  r: set.colors[(segment * 6) + (end * 3)],
  g: set.colors[(segment * 6) + (end * 3) + 1],
  b: set.colors[(segment * 6) + (end * 3) + 2],
});

/**
 * Colours come back out of a Float32Array, so they are the single-precision
 * neighbours of the double-precision constants rather than the constants
 * themselves. Comparing channel by channel keeps the assertion about the
 * colour rather than about the storage.
 */
const expectColor = (actual, expected) => {
  expect(actual.r).toBeCloseTo(expected.r, 6);
  expect(actual.g).toBeCloseTo(expected.g, 6);
  expect(actual.b).toBeCloseTo(expected.b, 6);
};

const endpointPosition = (set, segment, end) => ({
  x: set.positions[(segment * 6) + (end * 3)],
  y: set.positions[(segment * 6) + (end * 3) + 1],
  z: set.positions[(segment * 6) + (end * 3) + 2],
});

describe('buildSegments', () => {
  describe('splitting rapids from cuts', () => {
    /**
     * Rapids and cuts end up in separate draw sets rather than sharing one,
     * because they need different line widths — and a LineMaterial carries a
     * single width for everything it draws. Drawing an air move as thick as a
     * cut is the specific thing that makes a toolpath hard to read.
     */
    it('puts each segment in the set its arriving motion names', () => {
      const segments = buildSegments(buildToolpath([
        'G21 G90',
        'G0 X10',
        'G1 X20',
        'G1 X30',
        'G0 X40',
      ].join('\n')));

      // Four vertices, so three segments joining them: G1, G1, G0.
      expect(segmentCount(segments.cut)).toBe(2);
      expect(segmentCount(segments.rapid)).toBe(1);
    });

    it('joins consecutive vertices, so the path has no gaps', () => {
      const segments = buildSegments(buildToolpath([
        'G21 G90',
        'G0 X10 Y0',
        'G1 X10 Y10',
      ].join('\n')));

      // The single cut runs from where the rapid left the tool to the
      // commanded point. A set that started each segment at its own vertex
      // would draw nothing at all.
      expect(endpointPosition(segments.cut, 0, 0)).toEqual({ x: 10, y: 0, z: 0 });
      expect(endpointPosition(segments.cut, 0, 1)).toEqual({ x: 10, y: 10, z: 0 });
    });

    it('draws nothing before the first vertex', () => {
      const segments = buildSegments(buildToolpath('G21 G90\nG1 X10\n'));

      // One vertex is a position, not a move: there is no previous point to
      // join it to, and inventing the origin would draw a cut the machine
      // never makes.
      expect(segmentCount(segments.cut)).toBe(0);
      expect(segmentCount(segments.rapid)).toBe(0);
    });

    it('returns empty sets for an empty program', () => {
      const segments = buildSegments(buildToolpath(''));

      expect(segmentCount(segments.cut)).toBe(0);
      expect(segmentCount(segments.rapid)).toBe(0);
      expect(segments.cut.positions).toHaveLength(0);
      expect(segments.rapid.colors).toHaveLength(0);
    });
  });

  describe('colour', () => {
    it('gives every rapid the same colour, whatever its height', () => {
      const segments = buildSegments(buildToolpath([
        'G21 G90',
        'G1 X0 Y0 Z-5',
        'G0 X10 Z5',
        'G1 X20 Z-5',
        'G0 X30 Z5',
      ].join('\n')));

      for (let i = 0; i < segmentCount(segments.rapid); ++i) {
        expectColor(endpointColor(segments.rapid, i, 0), RAPID_COLOR);
        expectColor(endpointColor(segments.rapid, i, 1), RAPID_COLOR);
      }
    });

    it('colours each end of a cut by its own depth', () => {
      // A plunge: one segment whose ends are 5 mm apart in Z.
      const segments = buildSegments(buildToolpath([
        'G21 G90',
        'G1 X0 Y0 Z0',
        'G1 Z-5',
        'G1 X10',
      ].join('\n')));

      const top = endpointColor(segments.cut, 0, 0);
      const bottom = endpointColor(segments.cut, 0, 1);

      // The gradient runs along the plunge rather than flooding it with one
      // colour, which is what makes depth readable on a single move.
      expect(top).not.toEqual(bottom);
    });

    it('runs the ramp from shallow to deep across the cutting range', () => {
      expect(depthColor(0, -5, 0)).toEqual(CUT_SHALLOW);
      expect(depthColor(-5, -5, 0)).toEqual(CUT_DEEP);

      const middle = depthColor(-2.5, -5, 0);
      expect(middle).not.toEqual(CUT_SHALLOW);
      expect(middle).not.toEqual(CUT_DEEP);
    });

    it('is monotonic, so deeper always reads as further along the ramp', () => {
      const channel = (z) => depthColor(z, -10, 0).b;
      const samples = [0, -2, -4, -6, -8, -10].map(channel);

      const rising = samples.every((v, i) => i === 0 || v >= samples[i - 1]);
      const falling = samples.every((v, i) => i === 0 || v <= samples[i - 1]);
      expect(rising || falling).toBe(true);
    });

    it('takes its range from the cuts alone, ignoring where rapids fly', () => {
      // Clearance height is +50 here. If the ramp spanned every vertex, the
      // 1 mm of actual cutting would collapse into one indistinguishable
      // colour at the shallow end.
      const withClearance = buildSegments(buildToolpath([
        'G21 G90',
        'G1 X0 Y0 Z0',
        'G1 X10 Z-1',
        'G0 Z50',
        'G0 X20',
      ].join('\n')));

      // The shallowest cut sits at the shallow end of the ramp. Had the +50
      // clearance been folded in, Z=0 would land a fiftieth of the way along
      // it instead — which is the whole failure this guards against.
      expectColor(endpointColor(withClearance.cut, 0, 0), CUT_SHALLOW);
      expectColor(endpointColor(withClearance.cut, 0, 1), CUT_DEEP);
    });

    it('does not divide by a zero range when the job is flat', () => {
      const segments = buildSegments(buildToolpath([
        'G21 G90',
        'G1 X0 Y0 Z-1',
        'G1 X10',
        'G1 X20',
      ].join('\n')));

      for (let i = 0; i < segmentCount(segments.cut); ++i) {
        const { r, g, b } = endpointColor(segments.cut, i, 0);
        expect(Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)).toBe(true);
      }
    });
  });

  describe('progress', () => {
    /**
     * `setFrameIndex` greys out what the machine has already cut, and it is
     * driven by a vertex index. Splitting one strip into two draw sets means
     * neither set's segment numbering matches that index any more, so each
     * segment carries the vertex it arrives at.
     */
    it('records the arriving vertex of each segment, in order', () => {
      const segments = buildSegments(buildToolpath([
        'G21 G90',
        'G0 X10',
        'G1 X20',
        'G0 X30',
        'G1 X40',
      ].join('\n')));

      // Four vertices — G0, G1, G0, G1 — so three segments, each named by the
      // vertex it arrives at: a cut at 1, a rapid at 2, a cut at 3.
      expect(Array.from(segments.rapid.vertexIndex)).toEqual([2]);
      expect(Array.from(segments.cut.vertexIndex)).toEqual([1, 3]);
    });

    describe('completedCount', () => {
      // A set whose segments arrive at vertices 1, 4, 5 and 9 — the gaps are
      // the segments that went into the *other* set.
      const vertexIndex = new Uint32Array([1, 4, 5, 9]);

      it('counts a segment as cut once the machine has passed the vertex it arrives at', () => {
        expect(completedCount(vertexIndex, 1)).toBe(1);
        expect(completedCount(vertexIndex, 5)).toBe(3);
        expect(completedCount(vertexIndex, 9)).toBe(4);
      });

      it('counts nothing before the first segment lands', () => {
        expect(completedCount(vertexIndex, 0)).toBe(0);
      });

      it('does not count a segment the machine is still travelling', () => {
        // Vertex 6 is past the segment arriving at 5 but short of the one
        // arriving at 9, which is the move currently under way.
        expect(completedCount(vertexIndex, 6)).toBe(3);
      });

      it('saturates rather than running off the end', () => {
        expect(completedCount(vertexIndex, 1000)).toBe(4);
        expect(completedCount(new Uint32Array(0), 5)).toBe(0);
      });

      it('agrees with a linear scan over a long run', () => {
        // The binary search is only valid because vertexIndex ascends. This
        // checks it against the obvious implementation rather than against
        // the reasoning that says it should be equivalent.
        const many = Uint32Array.from({ length: 500 }, (_, i) => i * 3);
        const scan = (threshold) => many.filter((v) => v <= threshold).length;

        for (let threshold = 0; threshold < 1500; threshold += 7) {
          expect(completedCount(many, threshold)).toBe(scan(threshold));
        }
      });
    });
  });
});
