import colornames from 'colornames';
import * as THREE from 'three';

const buildAxis = (src, dst, color, dashed) => {
  let geometry = new THREE.Geometry();
  let material;

  if (dashed) {
    material = new THREE.LineDashedMaterial({
      linewidth: 1,
      color: color,
      dashSize: 1,
      gapSize: 1,
      opacity: 0.8,
      transparent: true
    });
  } else {
    material = new THREE.LineBasicMaterial({
      linewidth: 1,
      color: color,
      opacity: 0.8,
      transparent: true
    });
  }

  geometry.vertices.push(src.clone());
  geometry.vertices.push(dst.clone());

  const axisLine = new THREE.Line(geometry, material);

  if (dashed) {
    // Computes an array of distance values which are necessary for LineDashedMaterial.
    axisLine.computeLineDistances();
  }

  return axisLine;
};

// CoordinateAxes
// An axis object to visualize the the 3 axes in a simple way.
// The X axis is red. The Y axis is green. The Z axis is blue.
// Each axis extends from its min to max value, with positive direction solid
// and negative direction dashed.
class CoordinateAxes {
    group = new THREE.Object3D();

    // @param {object} bounds  { xmin, xmax, ymin, ymax, zmin, zmax }
    //                         All values are in the same world units.
    //                         Positive directions are drawn solid, negative dashed.
    constructor({ minX = 0, maxX, minY = 0, maxY, minZ = 0, maxZ }) {
      const origin = new THREE.Vector3(0, 0, 0);
      const red = colornames('red');
      const green = colornames('green');
      const blue = colornames('blue');

      if (maxX > 0) {
        this.group.add(buildAxis(origin, new THREE.Vector3(maxX, 0, 0), red, false)); // +X solid
      }
      if (minX < 0) {
        this.group.add(buildAxis(origin, new THREE.Vector3(minX, 0, 0), red, true)); // -X dashed
      }

      if (maxY > 0) {
        this.group.add(buildAxis(origin, new THREE.Vector3(0, maxY, 0), green, false)); // +Y solid
      }
      if (minY < 0) {
        this.group.add(buildAxis(origin, new THREE.Vector3(0, minY, 0), green, true)); // -Y dashed
      }

      if (maxZ > 0) {
        this.group.add(buildAxis(origin, new THREE.Vector3(0, 0, maxZ), blue, false)); // +Z solid
      }
      if (minZ < 0) {
        this.group.add(buildAxis(origin, new THREE.Vector3(0, 0, minZ), blue, true)); // -Z dashed
      }

      return this.group;
    }
}

export default CoordinateAxes;
