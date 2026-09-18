import GCodeVisualizer from '../GCodeVisualizer';

/**
 * The half of the visualizer a screenshot cannot reach.
 *
 * Greying out the completed part of a toolpath only happens while a program
 * is streaming, and making that happen in the e2e suite would mean sending
 * motion commands to the machine on the bench. So it is exercised here
 * instead, against the real three.js buffers — no GL context is needed to
 * build geometry and read colours back out of it.
 */

// G0, G1, G0, G1: four vertices, so a cut arriving at vertex 1, a rapid
// arriving at 2, and a cut arriving at 3. Frame N is the state after line N
// has run, so frames run 0, 1, 2, 3, 4.
const PROGRAM = [
  'G21 G90',
  'G0 X10',
  'G1 X20',
  'G0 X30',
  'G1 X40',
].join('\n');

const setNamed = (visualizer, name) => visualizer.sets
  .find((set) => set.line.material.dashed === (name === 'rapid'));

const colorsOf = (set) => set.line.geometry.getAttribute('instanceColorStart').data.array;

const segmentColor = (set, segment) => {
  const colors = colorsOf(set);
  return {
    r: colors[segment * 6],
    g: colors[(segment * 6) + 1],
    b: colors[(segment * 6) + 2],
  };
};

// lightgrey is #d3d3d3, so a greyed segment has three equal channels while
// nothing on the depth ramp or the rapid colour does.
const isGrey = ({ r, g, b }) => (r === g) && (g === b);

describe('GCodeVisualizer', () => {
  describe('render', () => {
    it('draws rapids and cuts as separate objects', () => {
      const visualizer = new GCodeVisualizer();
      const group = visualizer.render(PROGRAM);

      expect(group.children).toHaveLength(2);
      expect(visualizer.sets).toHaveLength(2);
    });

    it('adds nothing for a set with no segments in it', () => {
      const visualizer = new GCodeVisualizer();
      // No rapids at all, so a rapid object would be an empty draw call and a
      // geometry with a degenerate bounding box.
      const group = visualizer.render('G21 G90\nG1 X10\nG1 X20\n');

      expect(group.children).toHaveLength(1);
    });

    it('draws nothing at all for an empty program', () => {
      const visualizer = new GCodeVisualizer();

      expect(visualizer.render('').children).toHaveLength(0);
    });

    it('replaces the previous toolpath instead of piling up on it', () => {
      const visualizer = new GCodeVisualizer();
      visualizer.render(PROGRAM);
      const group = visualizer.render(PROGRAM);

      expect(group.children).toHaveLength(2);
      expect(visualizer.sets).toHaveLength(2);
    });

    it('keeps the pristine colours separate from the ones the GPU reads', () => {
      const visualizer = new GCodeVisualizer();
      visualizer.render(PROGRAM);
      const set = visualizer.sets[0];

      // setColors keeps the array it is handed rather than copying it, so if
      // the two were the same buffer, greying a segment would destroy the
      // only record of what colour it started as and rewinding could never
      // put it back.
      expect(set.live).not.toBe(set.base);
      expect(Array.from(set.live)).toEqual(Array.from(set.base));
    });
  });

  describe('setFrameIndex', () => {
    it('greys what has been cut and leaves what has not', () => {
      const visualizer = new GCodeVisualizer();
      visualizer.render(PROGRAM);
      const cut = setNamed(visualizer, 'cut');

      expect(isGrey(segmentColor(cut, 0))).toBe(false);

      // Frame 2 is "the machine has run up to and including line 2", which is
      // the cut arriving at vertex 2 — so the first cut segment is done and
      // the second is not.
      visualizer.setFrameIndex(2);

      expect(isGrey(segmentColor(cut, 0))).toBe(true);
      expect(isGrey(segmentColor(cut, 1))).toBe(false);
    });

    it('greys the rapids too, on their own numbering', () => {
      const visualizer = new GCodeVisualizer();
      visualizer.render(PROGRAM);
      const rapid = setNamed(visualizer, 'rapid');

      visualizer.setFrameIndex(2);

      expect(isGrey(segmentColor(rapid, 0))).toBe(true);
    });

    it('puts the colours back when the frame index rewinds', () => {
      const visualizer = new GCodeVisualizer();
      visualizer.render(PROGRAM);
      const cut = setNamed(visualizer, 'cut');
      const before = Array.from(colorsOf(cut));

      visualizer.setFrameIndex(4);
      expect(Array.from(colorsOf(cut))).not.toEqual(before);

      visualizer.setFrameIndex(0);
      // Exactly, not approximately: a restore that drifts would slowly bleach
      // a toolpath that is paused and resumed a few times.
      expect(Array.from(colorsOf(cut))).toEqual(before);
    });

    /**
     * `needsUpdate` is a write-only setter on an interleaved buffer — it bumps
     * `version` and there is no getter — so `version` is what these read.
     */
    it('tells the renderer the colours changed', () => {
      const visualizer = new GCodeVisualizer();
      visualizer.render(PROGRAM);
      const cut = setNamed(visualizer, 'cut');
      const buffer = cut.line.geometry.getAttribute('instanceColorStart').data;
      const before = buffer.version;

      visualizer.setFrameIndex(2);

      // Without this the greying happens in a buffer the GPU never re-reads,
      // so the toolpath keeps its original colours on screen while every
      // assertion about the arrays passes.
      expect(buffer.version).toBeGreaterThan(before);
    });

    it('does not re-upload when the frame index has not passed a segment', () => {
      const visualizer = new GCodeVisualizer();
      visualizer.render(PROGRAM);
      const cut = setNamed(visualizer, 'cut');
      const buffer = cut.line.geometry.getAttribute('instanceColorStart').data;

      visualizer.setFrameIndex(2);
      const settled = buffer.version;

      // Still frame 2's worth of segments: the sender reports every line, and
      // most lines do not complete one.
      visualizer.setFrameIndex(2);

      expect(buffer.version).toBe(settled);
    });

    it('ignores a frame index for a program that was never rendered', () => {
      const visualizer = new GCodeVisualizer();

      expect(() => visualizer.setFrameIndex(5)).not.toThrow();
    });

    it('clamps a frame index past the end of the program', () => {
      const visualizer = new GCodeVisualizer();
      visualizer.render(PROGRAM);

      visualizer.setFrameIndex(9999);

      expect(visualizer.frameIndex).toBe(visualizer.frames.length - 1);
    });
  });

  describe('setResolution', () => {
    it('reaches the material of every set', () => {
      const visualizer = new GCodeVisualizer();
      visualizer.render(PROGRAM);

      visualizer.setResolution(1280, 720);

      // A fat line is built in screen space, so a material that does not know
      // the canvas size draws a width that means nothing.
      visualizer.sets.forEach(({ line }) => {
        expect(line.material.resolution.x).toBe(1280);
        expect(line.material.resolution.y).toBe(720);
      });
    });

    it('applies to sets created after it was set', () => {
      const visualizer = new GCodeVisualizer();
      visualizer.setResolution(800, 600);
      visualizer.render(PROGRAM);

      visualizer.sets.forEach(({ line }) => {
        expect(line.material.resolution.x).toBe(800);
      });
    });
  });
});
