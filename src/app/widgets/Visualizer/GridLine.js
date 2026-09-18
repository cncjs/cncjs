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

      const positions = [];
      const colors = [];

      const addLine = (x1, y1, x2, y2, color) => {
        positions.push(x1, y1, 0, x2, y2, 0);
        colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
      };

      // Horizontal lines (parallel to X axis)
      for (let i = startY; i <= endY + stepY * 0.5; i += stepY) {
        addLine(startX, i, endX, i, (i === 0) ? colorCenterLine : colorGrid);
      }

      // Vertical lines (parallel to Y axis)
      for (let i = startX; i <= endX + stepX * 0.5; i += stepX) {
        addLine(i, startY, i, endY, (i === 0) ? colorCenterLine : colorGrid);
      }

      // One LineSegments for the whole grid rather than one THREE.Line per
      // grid line. The old shape was a consequence of THREE.Geometry making a
      // two-vertex object cheap to write; a metric grid across a 600 mm bed is
      // 120 of them, and the callers that walk `group.children` to set opacity
      // now have one child to walk instead.
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

      const material = new THREE.LineBasicMaterial({
        vertexColors: true
      });

      this.group.add(new THREE.LineSegments(geometry, material));

      return this.group;
    }
}

export default GridLine;
