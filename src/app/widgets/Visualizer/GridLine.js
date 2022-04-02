import * as THREE from 'three';

class GridLine {
  group = new THREE.Object3D();

  colorCenterLine = new THREE.Color(0x444444);

  colorGrid = new THREE.Color(0x888888);

  constructor(sizeX, stepX, sizeY, stepY, colorCenterLine, colorGrid) {
    colorCenterLine = new THREE.Color(colorCenterLine) || this.colorCenterLine;
    colorGrid = new THREE.Color(colorGrid) || this.colorGrid;

    sizeY = (typeof sizeY === 'undefined') ? sizeX : sizeY;
    stepY = (typeof stepY === 'undefined') ? stepX : stepY;

    for (let i = -1 * sizeX; i <= sizeX; i += stepX) {
      const geometry = new THREE.BufferGeometry();
      const material = new THREE.LineBasicMaterial({
        vertexColors: THREE.VertexColors
      });
      const positions = [];
      const colors = [];
      const color = (i === 0) ? colorCenterLine : colorGrid;
      positions.push(-sizeX, i, 0);
      positions.push(sizeX, i, 0);
      colors.push(color.r, color.g, color.b);
      colors.push(color.r, color.g, color.b);
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));

      this.group.add(new THREE.Line(geometry, material));
    }

    for (let i = -1 * sizeY; i <= sizeY; i += stepY) {
      const geometry = new THREE.BufferGeometry();
      const material = new THREE.LineBasicMaterial({
        vertexColors: THREE.VertexColors
      });
      const positions = [];
      const colors = [];
      const color = (i === 0) ? colorCenterLine : colorGrid;
      positions.push(i, -sizeY, 0);
      positions.push(i, sizeY, 0);
      colors.push(color.r, color.g, color.b);
      colors.push(color.r, color.g, color.b);
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));

      this.group.add(new THREE.Line(geometry, material));
    }

    return this.group;
  }
}

export default GridLine;
