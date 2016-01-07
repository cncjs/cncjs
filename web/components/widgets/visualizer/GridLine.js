import THREE from 'three';

class GridLine extends THREE.Line {
    group = new THREE.Object3D();

    colorCenterLine = new THREE.Color(0x444444);
    colorGrid = new THREE.Color(0x888888);

    constructor(sizeX, stepX, sizeY, stepY) {
        let geometry = new THREE.Geometry();
        let material = new THREE.LineBasicMaterial({
            vertexColors: THREE.VertexColors
        });

        super(geometry, material);
        
        sizeY = (typeof sizeY === 'undefined') ? sizeX : sizeY;
        stepY = (typeof stepY === 'undefined') ? stepX : stepY;

        for (let i = -1 * sizeX; i <= sizeX; i += stepX) {
            geometry.vertices.push(
                new THREE.Vector3(-sizeX, i, 0),
                new THREE.Vector3(sizeX, i, 0),
            );

            let color = (i === 0) ? this.colorCenterLine : this.colorGrid;
            geometry.colors.push(color, color, color, color);
        }

        for (let i = -1 * sizeY; i <= sizeY; i += stepY) {
            geometry.vertices.push(
                new THREE.Vector3(i, -sizeY, 0),
                new THREE.Vector3(i, sizeY, 0),
            );

            let color = (i === 0) ? this.colorCenterLine : this.colorGrid;
            geometry.colors.push(color, color, color, color);
        }
    }
    setColors(colorCenterLine, colorGrid) {
        this.colorCenterLine.set(colorCenterLine);
        this.colorGrid.set(colorGrid);
        this.geometry.colorsNeedUpdate = true;
    }
}

export default GridLine;
