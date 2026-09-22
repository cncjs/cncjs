import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import log from 'app/lib/log';
import { TOOLPATH_DONE } from '../../../lib/toolpath/palette';
import buildToolpath from '../../../lib/toolpath/toolpath-geometry';
import buildSegments, { completedCount } from '../../../lib/toolpath/toolpath-segments';

// What the machine has already cut. Grey rather than absent, so the shape of
// the finished work stays legible while it stops competing with what is still
// to come.
const doneColor = new THREE.Color(TOOLPATH_DONE);

// Thickness in CSS pixels. `LineBasicMaterial.linewidth` is ignored by WebGL
// on nearly every platform, which is why the old toolpath read as an
// oscilloscope trace whatever it was set to; LineMaterial builds its own
// screen-space geometry and actually honours a width.
const CUT_LINEWIDTH = 2;
const RAPID_LINEWIDTH = 1;

// Dash lengths in millimetres, since the material measures them in world
// units. Rapids are dashed as well as thinner because that is the distinction
// that survives being glanced at.
const RAPID_DASH_SIZE = 2;
const RAPID_GAP_SIZE = 2;

/**
 * Draws a G-code program as a toolpath, and greys out the part of it the
 * machine has already cut.
 *
 * The vertices come from `toolpath-geometry`, and the split into draw sets
 * with their colours from `toolpath-segments`; both are plain arithmetic and
 * unit-tested as such. What is left here is the three.js side: two fat-line
 * objects, and the bookkeeping that lets a frame index move forwards and
 * backwards through their colours.
 */
class GCodeVisualizer {
  constructor() {
    this.group = new THREE.Object3D();

    // One entry per draw set, each holding the live colour buffer the GPU
    // reads, a pristine copy to restore from, the vertex each segment arrives
    // at, and how many of them are currently greyed.
    this.sets = [];

    this.frames = []; // [{ data, vertexIndex }]
    this.frameIndex = 0;

    this.resolution = new THREE.Vector2(1, 1);

    return this;
  }

  render(gcode) {
    const toolpath = buildToolpath(gcode);
    const segments = buildSegments(toolpath);

    this.frames = toolpath.frames;
    this.frameIndex = 0;

    this.dispose();

    this.addSet(segments.cut, {
      linewidth: CUT_LINEWIDTH,
    });
    this.addSet(segments.rapid, {
      linewidth: RAPID_LINEWIDTH,
      dashed: true,
      dashSize: RAPID_DASH_SIZE,
      gapSize: RAPID_GAP_SIZE,
      opacity: 0.85,
      transparent: true,
    });

    log.debug({
      sets: this.sets.length,
      frames: this.frames.length,
      frameIndex: this.frameIndex
    });

    return this.group;
  }

  addSet(segments, materialOptions) {
    if (segments.vertexIndex.length === 0) {
      return;
    }

    // setColors keeps the array it is handed rather than copying it, so this
    // copy is the buffer the GPU reads and `segments.colors` stays the only
    // record of what the colours were before the job started greying them.
    const live = segments.colors.slice();

    const geometry = new LineSegmentsGeometry();
    geometry.setPositions(segments.positions);
    geometry.setColors(live);

    const material = new LineMaterial({
      vertexColors: true,
      ...materialOptions,
    });
    material.resolution.copy(this.resolution);

    const line = new Line2(geometry, material);
    if (materialOptions.dashed) {
      // Dash phase is measured along the line, so the distances have to exist
      // before any of it can be drawn.
      line.computeLineDistances();
    }

    this.group.add(line);
    this.sets.push({
      line,
      live,
      base: segments.colors,
      vertexIndex: segments.vertexIndex,
      done: 0,
    });
  }

  /**
   * Fat lines are built in screen space, so the material has to be told how
   * big the canvas is or the width it draws is meaningless. Called on every
   * resize.
   */
  setResolution(width, height) {
    this.resolution.set(width, height);
    this.sets.forEach(({ line }) => {
      line.material.resolution.copy(this.resolution);
    });
  }

  dispose() {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      child.geometry.dispose();
      child.material.dispose();
    }
    this.sets = [];
  }

  setFrameIndex(frameIndex) {
    if (this.frames.length === 0) {
      return;
    }

    frameIndex = Math.min(frameIndex, this.frames.length - 1);
    frameIndex = Math.max(frameIndex, 0);

    const threshold = this.frames[frameIndex].vertexIndex;

    this.sets.forEach((set) => {
      const done = completedCount(set.vertexIndex, threshold);
      if (done === set.done) {
        return;
      }

      const from = Math.min(set.done, done);
      const to = Math.max(set.done, done);

      if (done > set.done) {
        // Newly completed segments are greyed out.
        for (let i = from * 6; i < to * 6; i += 3) {
          set.live[i] = doneColor.r;
          set.live[i + 1] = doneColor.g;
          set.live[i + 2] = doneColor.b;
        }
      } else {
        // Rewound: restore the colours those segments were built with.
        set.live.set(set.base.subarray(from * 6, to * 6), from * 6);
      }

      // Both colour attributes read the same interleaved buffer, so raising
      // needsUpdate on it re-uploads the start and end of every segment.
      set.line.geometry.getAttribute('instanceColorStart').data.needsUpdate = true;
      set.done = done;
    });

    this.frameIndex = frameIndex;
  }
}

export default GCodeVisualizer;
