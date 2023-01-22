import * as THREE from 'three';

class CuttingPointer {
  constructor(options) {
    const {
      color = 0xffffff,
      diameter = 1,
      widthSegments = 32,
      heightSegments = 32,
      phiStart = 0,
      phiLength = Math.PI * 2,
      thetaStart = 0,
      thetaLength = Math.PI
    } = { ...options };
    const radius = Number(diameter / 2) || 1;

    const geometry = new THREE.SphereGeometry(
      radius,
      widthSegments,
      heightSegments,
      phiStart,
      phiLength,
      thetaStart,
      thetaLength
    );
    const material = new THREE.MeshBasicMaterial({
      color: color
    });

    return new THREE.Mesh(geometry, material);
  }
}

export default CuttingPointer;
