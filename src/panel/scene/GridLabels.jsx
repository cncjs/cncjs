import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { gridLabels } from './grid-lines';

/**
 * The numbers on the ground.
 *
 * **Lying in the grid's own plane**, not turned to face the camera. A figure
 * that always faces you is a label on a picture; one that lies on the surface
 * is a mark on the floor, and it foreshortens with everything else, which is
 * most of how it says which way the view is turned.
 *
 * `PlaneGeometry` already lies in XY and faces +Z, so in a Z-up world it wants
 * no rotation at all — it is flat on the floor as built.
 *
 * Drawn as text painted into a canvas and used as a texture. The alternatives
 * are a font file and `TextGeometry`, or a second dependency; this is a dozen
 * lines, reads at any distance the camera is likely to be, and takes its
 * colour from the token sheet like everything else in the scene.
 */

// How tall a figure is, as a fraction of one square. Small enough to sit in
// the gap outside the grid without touching it, large enough to read across a
// workshop.
const TEXT_HEIGHT = 0.42;

// Pixels per world unit in the texture. Three times the size a label is ever
// drawn on screen, so it stays sharp when the view is zoomed into a corner.
const RESOLUTION = 64;

const paint = (text, color) => {
  const canvas = document.createElement('canvas');
  const font = `600 ${RESOLUTION}px 'IBM Plex Sans', system-ui, sans-serif`;

  // Measured before the canvas is sized, because sizing it clears the context
  // and resets the font with it.
  const probe = canvas.getContext('2d');
  probe.font = font;
  const width = Math.ceil(probe.measureText(text).width);

  canvas.width = Math.max(1, width);
  canvas.height = Math.ceil(RESOLUTION * 1.4);

  const context = canvas.getContext('2d');
  context.font = font;
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  // The canvas was painted in sRGB; saying so is what stops the figures
  // coming out washed out against the ground.
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  return { texture, aspect: canvas.width / canvas.height };
};

const GridLabels = ({ area, step, z, color }) => {
  const labels = useMemo(() => {
    const height = step * TEXT_HEIGHT;

    return gridLabels(area, step).map((label) => {
      const { texture, aspect } = paint(label.text, color);
      return { ...label, texture, width: height * aspect, height };
    });
  }, [area, step, color]);

  useEffect(() => () => labels.forEach(({ texture }) => texture.dispose()), [labels]);

  return labels.map(({ key, x, y, texture, width, height }) => (
    <mesh key={key} position={[x, y, z]}>
      <planeGeometry args={[width, height]} />
      {/*
        * `depthWrite` off so a figure never hides the grid line behind it,
        * and `opacity` matching the grid's own weight — these are reference
        * marks, read when looked for and ignorable otherwise.
        */}
      <meshBasicMaterial map={texture} transparent opacity={0.55} depthWrite={false} />
    </mesh>
  ));
};

export default GridLabels;
