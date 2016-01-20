import THREE from 'three';

class GridLine {
    group = new THREE.Object3D();

    colorCenterLine = new THREE.Color(0x444444);
    colorGrid = new THREE.Color(0x888888);

    constructor(sizeX, stepX, sizeY, stepY, colorCenterLine, colorGrid) {
        let material = new THREE.LineBasicMaterial({
            vertexColors: THREE.VertexColors
        });

        colorCenterLine = new THREE.Color(colorCenterLine) || this.colorCenterLine;
        colorGrid = new THREE.Color(colorGrid) || this.colorGrid;

        sizeY = (typeof sizeY === 'undefined') ? sizeX : sizeY;
        stepY = (typeof stepY === 'undefined') ? stepX : stepY;

        for (let i = -1 * sizeX; i <= sizeX; i += stepX) {
            let geometry = new THREE.Geometry();
            let material = new THREE.LineBasicMaterial({
                vertexColors: THREE.VertexColors
            });
            let color = (i === 0) ? colorCenterLine : colorGrid;

            geometry.vertices.push(
                new THREE.Vector3(-sizeX, i, 0),
                new THREE.Vector3(sizeX, i, 0),
            );
            geometry.colors.push(color, color);

            this.group.add(new THREE.Line(geometry, material));
        }

        for (let i = -1 * sizeY; i <= sizeY; i += stepY) {
            let geometry = new THREE.Geometry();
            let material = new THREE.LineBasicMaterial({
                vertexColors: THREE.VertexColors
            });
            let color = (i === 0) ? colorCenterLine : colorGrid;

            geometry.vertices.push(
                new THREE.Vector3(i, -sizeY, 0),
                new THREE.Vector3(i, sizeY, 0),
            );
            geometry.colors.push(color, color);

            this.group.add(new THREE.Line(geometry, material));
        }

        return this.group;
    }
}

export default GridLine;
