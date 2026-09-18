import colornames from 'colornames';
import * as THREE from 'three';
import log from 'app/lib/log';
import buildToolpath, {
  ARC_CW,
  ARC_CCW,
  LINEAR,
  RAPID,
} from './toolpath-geometry';

const defaultColor = new THREE.Color(colornames('lightgrey'));

// Indexed by the motion labels `toolpath-geometry` emits, so the lookup is an
// array index rather than a string hash per vertex.
const motionColor = [];
motionColor[RAPID] = new THREE.Color(colornames('green'));
motionColor[LINEAR] = new THREE.Color(colornames('blue'));
motionColor[ARC_CW] = new THREE.Color(colornames('deepskyblue'));
motionColor[ARC_CCW] = new THREE.Color(colornames('deepskyblue'));

/**
 * Draws a G-code program as a toolpath, and greys out the part of it the
 * machine has already cut.
 *
 * Where the vertices come from is `toolpath-geometry`, which is plain
 * arithmetic and unit-tested as such. What is left here is the three.js side:
 * one buffer geometry, a colour per vertex, and the bookkeeping that lets a
 * frame index move forwards and backwards through those colours.
 */
class GCodeVisualizer {
  constructor() {
    this.group = new THREE.Object3D();

    // The colour every vertex started as, so rewinding the frame index can
    // put it back. The geometry's own colour attribute is the live copy and
    // diverges from this one as the job runs.
    this.baseColors = new Float32Array(0);

    this.frames = []; // [{ data, vertexIndex }]
    this.frameIndex = 0;

    return this;
  }

  render(gcode) {
    const toolpath = buildToolpath(gcode);

    this.frames = toolpath.frames;
    this.frameIndex = 0;

    const colors = new Float32Array(toolpath.vertexCount * 3);
    for (let i = 0; i < toolpath.vertexCount; ++i) {
      const color = motionColor[toolpath.motions[i]] || defaultColor;
      colors[i * 3] = color.r;
      colors[(i * 3) + 1] = color.g;
      colors[(i * 3) + 2] = color.b;
    }
    this.baseColors = colors.slice();

    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      child.geometry.dispose();
      child.material.dispose();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(toolpath.positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    // One continuous line through the vertices in order: consecutive vertices
    // are consecutive positions of the tool, so the strip *is* the path the
    // machine takes, rapids included.
    const workpiece = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        color: defaultColor,
        linewidth: 1,
        vertexColors: true,
        opacity: 0.5,
        transparent: true
      })
    );

    this.group.add(workpiece);

    log.debug({
      workpiece: workpiece,
      frames: this.frames,
      frameIndex: this.frameIndex
    });

    return this.group;
  }

  setFrameIndex(frameIndex) {
    if (this.frames.length === 0) {
      return;
    }

    frameIndex = Math.min(frameIndex, this.frames.length - 1);
    frameIndex = Math.max(frameIndex, 0);

    const v1 = this.frames[this.frameIndex].vertexIndex;
    const v2 = this.frames[frameIndex].vertexIndex;

    if (v1 === v2) {
      this.frameIndex = frameIndex;
      return;
    }

    const workpiece = this.group.children[0];
    if (!workpiece) {
      return;
    }

    const color = workpiece.geometry.getAttribute('color');
    const from = Math.min(v1, v2);
    const to = Math.max(v1, v2);

    if (v1 < v2) {
      // Newly completed path is greyed out.
      for (let i = from; i < to; ++i) {
        color.setXYZ(i, defaultColor.r, defaultColor.g, defaultColor.b);
      }
    } else {
      // Rewound: restore the path to the colours it was built with.
      for (let i = from; i < to; ++i) {
        color.setXYZ(
          i,
          this.baseColors[i * 3],
          this.baseColors[(i * 3) + 1],
          this.baseColors[(i * 3) + 2]
        );
      }
    }

    // Upload only the vertices that moved rather than the whole attribute:
    // this runs on every line the sender reports, and a large program's colour
    // buffer is megabytes.
    color.clearUpdateRanges();
    color.addUpdateRange(from * 3, (to - from) * 3);
    color.needsUpdate = true;

    this.frameIndex = frameIndex;
  }
}

export default GCodeVisualizer;
