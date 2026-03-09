import * as THREE from 'three';

class GridLine {
    group = new THREE.Object3D();

    colorCenterLine = new THREE.Color(0x444444);

    colorGrid = new THREE.Color(0x888888);

    // @param {number} minX  Start of grid on X axis
    // @param {number} maxX  End of grid on X axis
    // @param {number} stepX Grid spacing on X axis
    // @param {number} minY  Start of grid on Y axis
    // @param {number} maxY  End of grid on Y axis
    // @param {number} stepY Grid spacing on Y axis
    constructor(minX, maxX, stepX, minY, maxY, stepY, colorCenterLine, colorGrid) {
      colorCenterLine = new THREE.Color(colorCenterLine ?? this.colorCenterLine);
      colorGrid = new THREE.Color(colorGrid ?? this.colorGrid);

      if (typeof minY === 'undefined') {
        minY = minX;
      }
      if (typeof maxY === 'undefined') {
        maxY = maxX;
      }
      if (typeof stepY === 'undefined') {
        stepY = stepX;
      }

      // Snap min/max to grid step boundaries
      const startX = Math.floor(minX / stepX) * stepX;
      const endX = Math.ceil(maxX / stepX) * stepX;
      const startY = Math.floor(minY / stepY) * stepY;
      const endY = Math.ceil(maxY / stepY) * stepY;

      // Horizontal lines (parallel to X axis)
      for (let i = startY; i <= endY + stepY * 0.5; i += stepY) {
        const geometry = new THREE.Geometry();
        const material = new THREE.LineBasicMaterial({
          vertexColors: THREE.VertexColors
        });
        const color = (i === 0) ? colorCenterLine : colorGrid;

        geometry.vertices.push(
          new THREE.Vector3(startX, i, 0),
          new THREE.Vector3(endX, i, 0),
        );
        geometry.colors.push(color, color);

        this.group.add(new THREE.Line(geometry, material));
      }

      // Vertical lines (parallel to Y axis)
      for (let i = startX; i <= endX + stepX * 0.5; i += stepX) {
        const geometry = new THREE.Geometry();
        const material = new THREE.LineBasicMaterial({
          vertexColors: THREE.VertexColors
        });
        const color = (i === 0) ? colorCenterLine : colorGrid;

        geometry.vertices.push(
          new THREE.Vector3(i, startY, 0),
          new THREE.Vector3(i, endY, 0),
        );
        geometry.colors.push(color, color);

        this.group.add(new THREE.Line(geometry, material));
      }

      return this.group;
    }
}

export default GridLine;
