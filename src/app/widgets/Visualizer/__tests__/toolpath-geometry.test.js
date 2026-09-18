import buildToolpath, {
  ARC_CHORD_TOLERANCE,
  ARC_CW,
  ARC_CCW,
  LINEAR,
  RAPID,
} from '../toolpath-geometry';

// Reading a vertex back out of the flat position array.
const vertexAt = (geometry, index) => ({
  x: geometry.positions[index * 3],
  y: geometry.positions[(index * 3) + 1],
  z: geometry.positions[(index * 3) + 2],
});

const vertices = (geometry) => Array.from(
  { length: geometry.vertexCount },
  (_, index) => vertexAt(geometry, index)
);

describe('buildToolpath', () => {
  describe('linear motion', () => {
    it('emits one vertex per move, at the end point', () => {
      const geometry = buildToolpath('G21 G90\nG1 X10 Y20 Z-3\n');

      expect(geometry.vertexCount).toBe(1);
      expect(vertexAt(geometry, 0)).toEqual({ x: 10, y: 20, z: -3 });
    });

    it('labels each vertex with the motion that arrives at it', () => {
      const geometry = buildToolpath([
        'G21 G90',
        'G0 X10',
        'G1 X20',
        'G0 X30',
      ].join('\n'));

      expect(Array.from(geometry.motions)).toEqual([RAPID, LINEAR, RAPID]);
    });

    it('chains moves so the path is continuous', () => {
      const geometry = buildToolpath([
        'G21 G90',
        'G0 X10 Y0',
        'G1 X10 Y10',
        'G1 X0 Y10',
      ].join('\n'));

      expect(vertices(geometry)).toEqual([
        { x: 10, y: 0, z: 0 },
        { x: 10, y: 10, z: 0 },
        { x: 0, y: 10, z: 0 },
      ]);
    });
  });

  describe('arcs in the XY plane (G17)', () => {
    // A quarter turn counter-clockwise from (10, 0) to (0, 10) about the
    // origin. I/J are relative to the start point, so the centre is at
    // (10 - 10, 0 + 0) = (0, 0).
    const quarterCCW = 'G21 G90 G17\nG0 X10 Y0\nG3 X0 Y10 I-10 J0\n';

    it('interpolates the arc rather than drawing its chord', () => {
      const geometry = buildToolpath(quarterCCW);

      // One vertex for the rapid, then the arc.
      expect(geometry.vertexCount).toBeGreaterThan(10);
      expect(Array.from(geometry.motions).slice(1))
        .toEqual(expect.arrayContaining([ARC_CCW]));
    });

    it('keeps every interpolated point on the circle', () => {
      const geometry = buildToolpath(quarterCCW);

      const arc = vertices(geometry).slice(1);
      arc.forEach(({ x, y }) => {
        expect(Math.sqrt((x * x) + (y * y))).toBeCloseTo(10, 6);
      });
    });

    it('starts at the start point and ends at the end point', () => {
      const geometry = buildToolpath(quarterCCW);

      const arc = vertices(geometry).slice(1);
      expect(arc[0].x).toBeCloseTo(10, 6);
      expect(arc[0].y).toBeCloseTo(0, 6);
      expect(arc[arc.length - 1].x).toBeCloseTo(0, 6);
      expect(arc[arc.length - 1].y).toBeCloseTo(10, 6);
    });

    it('turns the other way round for G2', () => {
      const ccw = buildToolpath(quarterCCW);
      const cw = buildToolpath('G21 G90 G17\nG0 X10 Y0\nG2 X0 Y10 I-10 J0\n');

      // Same endpoints either way, so the endpoints cannot tell the two
      // apart — the midpoint is what does. Counter-clockwise from (10,0) to
      // (0,10) is the short way through (7.07, 7.07); clockwise is the long
      // way round through (-7.07, -7.07).
      const midpoint = (geometry) => {
        const arc = vertices(geometry).slice(1);
        return arc[Math.floor(arc.length / 2)];
      };

      expect(midpoint(ccw).x).toBeGreaterThan(0);
      expect(midpoint(ccw).y).toBeGreaterThan(0);
      expect(midpoint(cw).x).toBeLessThan(0);
      expect(midpoint(cw).y).toBeLessThan(0);

      // And the direction is on the label as well as in the geometry, so a
      // renderer can tell them apart without re-deriving the winding.
      expect(Array.from(cw.motions).slice(1).every((m) => m === ARC_CW)).toBe(true);
      expect(Array.from(ccw.motions).slice(1).every((m) => m === ARC_CCW)).toBe(true);
    });

    it('draws a full circle when the start and end points coincide', () => {
      const geometry = buildToolpath('G21 G90 G17\nG0 X10 Y0\nG2 X10 Y0 I-10 J0\n');

      const arc = vertices(geometry).slice(1);
      const xs = arc.map((v) => v.x);
      const ys = arc.map((v) => v.y);

      // A closed circle has to reach the far side; a degenerate one that
      // collapsed to zero sweep would sit at the start point throughout.
      //
      // Only to within the chord tolerance, though: samples land on discrete
      // angles, so whether one falls exactly on an extreme is an accident of
      // how the sweep divides. Demanding an exact -10 would be asserting that
      // accident rather than the geometry.
      expect(Math.min(...xs)).toBeLessThanOrEqual(-10 + ARC_CHORD_TOLERANCE);
      expect(Math.max(...xs)).toBeGreaterThanOrEqual(10 - ARC_CHORD_TOLERANCE);
      expect(Math.min(...ys)).toBeLessThanOrEqual(-10 + ARC_CHORD_TOLERANCE);
      expect(Math.max(...ys)).toBeGreaterThanOrEqual(10 - ARC_CHORD_TOLERANCE);
    });

    it('interpolates Z across a helical arc, reaching the commanded depth', () => {
      const geometry = buildToolpath('G21 G90 G17\nG0 X10 Y0 Z0\nG3 X0 Y10 Z-5 I-10 J0\n');

      const arc = vertices(geometry).slice(1);
      expect(arc[0].z).toBeCloseTo(0, 6);
      expect(arc[arc.length - 1].z).toBeCloseTo(-5, 6);

      // Monotonic descent: a helix that wanders in Z is not a helix.
      for (let i = 1; i < arc.length; ++i) {
        expect(arc[i].z).toBeLessThanOrEqual(arc[i - 1].z + 1e-9);
      }
    });
  });

  /**
   * The plane handling is the subtle part, and it is subtle because
   * `gcode-toolpath` hands arc endpoints back already permuted into
   * plane-local coordinates rather than in machine XYZ. For every plane the
   * circle lives in the reported x/y and the linearly interpolated axis is the
   * reported z; only the way back out to machine coordinates differs. These
   * cases are written in machine coordinates — the frame a reader thinks in —
   * so a permutation that is wrong in either direction fails them.
   */
  describe('arcs outside the XY plane', () => {
    it('sweeps X and Z and interpolates Y for G18', () => {
      const geometry = buildToolpath([
        'G21 G90 G18',
        'G0 X10 Y0 Z0',
        'G2 X0 Y4 Z10 I-10 K0',
      ].join('\n'));

      const arc = vertices(geometry).slice(1);

      arc.forEach(({ x, z }) => {
        expect(Math.sqrt((x * x) + (z * z))).toBeCloseTo(10, 6);
      });
      expect(arc[0].y).toBeCloseTo(0, 6);
      expect(arc[arc.length - 1].y).toBeCloseTo(4, 6);
      expect(arc[arc.length - 1].x).toBeCloseTo(0, 6);
      expect(arc[arc.length - 1].z).toBeCloseTo(10, 6);
    });

    it('sweeps Y and Z and interpolates X for G19', () => {
      const geometry = buildToolpath([
        'G21 G90 G19',
        'G0 X0 Y10 Z0',
        'G2 X4 Y0 Z10 J-10 K0',
      ].join('\n'));

      const arc = vertices(geometry).slice(1);

      arc.forEach(({ y, z }) => {
        expect(Math.sqrt((y * y) + (z * z))).toBeCloseTo(10, 6);
      });
      expect(arc[0].x).toBeCloseTo(0, 6);
      expect(arc[arc.length - 1].x).toBeCloseTo(4, 6);
      expect(arc[arc.length - 1].y).toBeCloseTo(0, 6);
      expect(arc[arc.length - 1].z).toBeCloseTo(10, 6);
    });
  });

  describe('frames', () => {
    it('records how many vertices exist once each line has run', () => {
      const geometry = buildToolpath([
        'G21 G90',
        'G0 X10',
        'G1 X20',
      ].join('\n'));

      expect(geometry.frames).toHaveLength(3);
      expect(geometry.frames.map((frame) => frame.vertexIndex)).toEqual([0, 1, 2]);
    });

    /**
     * The invariant that makes live progress correct, and the reason the
     * frontend cannot adopt a second G-code parser.
     *
     * `setFrameIndex` is driven by `state.gcode.sent`, which the server's
     * `Sender.load()` produces by splitting on newlines and dropping blank
     * lines. So a frame index is an index into *that* list. It lines up only
     * because the parser here skips blank and whitespace-only lines the same
     * way — a parser with a different idea of what counts as a line would
     * make the greyed-out "already cut" region disagree with what the machine
     * has actually done.
     */
    it('indexes frames the way the server counts sent lines', () => {
      const program = [
        '; a comment',
        '',
        'G0 X10',
        '   ',
        'G1 X20',
        '',
      ].join('\n');

      // Sender.load(): gcode.split('\n').filter(line => line.trim().length > 0)
      const sentLines = program.split('\n').filter((line) => line.trim().length > 0);

      const geometry = buildToolpath(program);

      expect(geometry.frames).toHaveLength(sentLines.length);
      expect(geometry.frames.map((frame) => frame.vertexIndex)).toEqual([0, 1, 2]);
    });

    it('never goes backwards', () => {
      const geometry = buildToolpath([
        'G21 G90 G17',
        'G0 X10 Y0',
        'G3 X0 Y10 I-10 J0',
        'G1 X0 Y20',
      ].join('\n'));

      const indices = geometry.frames.map((frame) => frame.vertexIndex);
      for (let i = 1; i < indices.length; ++i) {
        expect(indices[i]).toBeGreaterThanOrEqual(indices[i - 1]);
      }
      expect(indices[indices.length - 1]).toBeLessThanOrEqual(geometry.vertexCount);
    });
  });

  describe('bounding box', () => {
    it('spans every vertex', () => {
      const geometry = buildToolpath([
        'G21 G90',
        'G0 X10 Y-5 Z2',
        'G1 X-3 Y20 Z-7',
      ].join('\n'));

      expect(geometry.bbox).toEqual({
        min: { x: -3, y: -5, z: -7 },
        max: { x: 10, y: 20, z: 2 },
      });
    });

    it('collapses to the origin when there is nothing to draw', () => {
      const geometry = buildToolpath('; nothing but a comment\n');

      expect(geometry.vertexCount).toBe(0);
      expect(geometry.bbox).toEqual({
        min: { x: 0, y: 0, z: 0 },
        max: { x: 0, y: 0, z: 0 },
      });
    });
  });

  describe('degenerate input', () => {
    it('returns an empty geometry for an empty program', () => {
      const geometry = buildToolpath('');

      expect(geometry.vertexCount).toBe(0);
      expect(geometry.positions).toHaveLength(0);
      expect(geometry.motions).toHaveLength(0);
      expect(geometry.frames).toEqual([]);
    });

    /**
     * There is no "unknown motion" case to handle. `gcode-toolpath` emits
     * geometry only from its G0/G1 handlers (addLine) and its G2/G3 handlers
     * (addArcCurve); G38.x probe moves set the modal and draw nothing at all,
     * which is why this asserts an empty geometry rather than a fallback
     * label.
     */
    it('draws nothing for a probe move, which the parser does not emit', () => {
      const geometry = buildToolpath('G21 G90\nG38.2 Z-10 F50\n');

      expect(geometry.vertexCount).toBe(0);
    });
  });
});
