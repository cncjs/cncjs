import * as THREE from 'three';

class TargetPoint {
    group = new THREE.Object3D();

    constructor(options) {
        const {
            color = 0xffffff,
            radius = 0.5,
            widthSegments = 32,
            heightSegments = 32,
            phiStart = 0,
            phiLength = Math.PI * 2,
            thetaStart = 0,
            thetaLength = Math.PI
        } = { ...options };

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
            color: color,
            opacity: 0.9,
            transparent: true
        });
        const cube = new THREE.Mesh(geometry, material);

        this.group.add(cube);

        return this.group;
    }
}

export default TargetPoint;
