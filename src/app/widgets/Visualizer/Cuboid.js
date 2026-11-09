import * as THREE from 'three';

class Cuboid {
  constructor(options) {
    const {
      dx = 0,
      dy = 0,
      dz = 0,
      color = 0x000000,
      opacity = 1,
      transparent = true,
      dashed = false,
      ...others
    } = { ...options };

    const geometry = new THREE.BoxGeometry(
      dx, // width
      dy, // height
      dz, // depth
    );
    const hasFaces = !geometry.isGeometry || geometry.faces.length > 0;
    const edges = hasFaces ? new THREE.EdgesGeometry(geometry) : new THREE.BufferGeometry();
    geometry.dispose();

    let material;

    if (dashed) {
      material = new THREE.LineDashedMaterial({
        color,
        opacity,
        transparent,
        ...others
      });
    } else {
      material = new THREE.LineBasicMaterial({
        color,
        opacity,
        transparent,
        ...others
      });
    }

    const lineSegments = new THREE.LineSegments(edges, material);

    if (dashed && (edges.getAttribute('position')?.count || 0) > 0) {
      // Computes an array of distance values which are necessary for LineDashedMaterial.
      lineSegments.computeLineDistances();
    }

    return lineSegments;
  }
}

export default Cuboid;
