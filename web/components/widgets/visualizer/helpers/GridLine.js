import _ from 'lodash';
import THREE from 'three';

const buildLine = (src, dst, color) => {
    let geometry = new THREE.Geometry();
    let material = new THREE.LineBasicMaterial({
        color: color,
        opacity: 0.5,
        transparent: true
    });

    geometry.vertices.push(src.clone());
    geometry.vertices.push(dst.clone());

    return new THREE.Line(geometry, material);
};

class GridLine {
    group = new THREE.Object3D();

    constructor(size, step, colorCenterLine, colorGrid) {
        let list = _.range(-size, size, step);

        if (typeof colorCenterLine === 'undefined') {
            colorCenterLine = 0x444444;
        }
        if (typeof colorGrid === 'undefined') {
            colorGrid = 0x888888;
        }

        _.each(list, (i) => {
            let color = (i === 0) ? colorCenterLine : colorGrid;

            if (color === null) { // transparent
                return;
            }

            let lineX = buildLine(
                new THREE.Vector3(-size, i, 0),
                new THREE.Vector3(size, i, 0),
                color
            );

            let lineY = buildLine(
                new THREE.Vector3(i, -size, 0),
                new THREE.Vector3(i, size, 0),
                color
            );

            this.group.add(lineX);
            this.group.add(lineY);
        });

        return this.group;
    }
}

export default GridLine;
