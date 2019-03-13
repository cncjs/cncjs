import * as THREE from 'three';

class AxisLimits {
    group = new THREE.Object3D();

    constructor(xmin, xmax, ymin, ymax, zmin, zmax) {
        const xLength = (xmax - xmin) || 0;
        const yLength = (ymax - ymin) || 0;
        const zLength = (zmax - zmin) || 0;

        if (xLength || yLength || zLength) {
            const box = new THREE.BoxGeometry(xLength || 0.0001, yLength || 0.0001, zLength || 0.0001);
            const geometry = new THREE.EdgesGeometry(box);
            const material = new THREE.LineBasicMaterial({
                color: 0x00ff00,
                linewidth: 2
            });

            const lineSegments = new THREE.LineSegments(geometry, material);
            lineSegments.position.set(
                ((xmax + xmin) || 0) / 2,
                ((ymax + ymin) || 0) / 2,
                ((zmax + zmin) || 0) / 2
            );

            this.group.add(lineSegments);
        }

        return this.group;
    }
}

export default AxisLimits;
