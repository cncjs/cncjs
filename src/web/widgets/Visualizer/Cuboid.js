import * as THREE from 'three';

class Cuboid {
    constructor(options) {
        const {
            dx = 0,
            dy = 0,
            dz = 0,
            color = 0x000000,
            opacity = 1,
            transparent = true,
        } = { ...options };

        const geometry = new THREE.BoxGeometry(
            dx, // width
            dy, // height
            dz, // depth
        );
        const edges = new THREE.EdgesGeometry(geometry);
        const material = new THREE.LineBasicMaterial({
            color,
            opacity,
            transparent,
        });

        return new THREE.LineSegments(edges, material);
    }
}

export default Cuboid;
