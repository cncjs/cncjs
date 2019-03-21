import * as THREE from 'three';

class AxisLimits {
    group = new THREE.Object3D();

    constructor(xmin, xmax, ymin, ymax, zmin, zmax) {
        const dx = (xmax - xmin) || 0;
        const dy = (ymax - ymin) || 0;
        const dz = (zmax - zmin) || 0;

        if (dx || dy || dz) {
            // Box
            const material = new THREE.MeshBasicMaterial({
                visible: true,
                side: THREE.FrontSide,
                transparent: true,
                color: 0x000000,
                opacity: 0.05,
            });
            const geometry = new THREE.BoxGeometry(
                dx, // width
                dy, // height
                dz, // depth
            );
            const edges = new THREE.EdgesGeometry(geometry);

            this.group.add(new THREE.Mesh(geometry, material));
            this.group.add(new THREE.LineSegments(edges, material));

            this.group.position.set(
                ((xmax + xmin) || 0) / 2,
                ((ymax + ymin) || 0) / 2,
                ((zmax + zmin) || 0) / 2
            );
        }

        return this.group;
    }
}

export default AxisLimits;
