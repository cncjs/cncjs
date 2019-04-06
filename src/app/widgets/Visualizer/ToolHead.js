import * as THREE from 'three';

const buildToolHead = (color, texture) => {
    const object = new THREE.Object3D();
    const radiusTop = 2.0;
    const radiusBottom = 0.1;
    const height = 20;
    const radiusSegments = 32;
    const heightSegments = 1;
    const openEnded = false;
    const thetaStart = 0;
    const thetaLength = 2 * Math.PI;

    // Geometry
    const geometry = new THREE.CylinderGeometry(
        radiusTop, radiusBottom, height, radiusSegments, heightSegments, openEnded, thetaStart, thetaLength
    );
    // Rotates the geometry 90 degrees around the X axis.
    geometry.rotateX(Math.PI / 2);
    // Set the desired position from the origin rather than its center.
    geometry.translate(0, 0, height / 2);

    // Material
    const materialFront = new THREE.MeshBasicMaterial({
        color: color,
        map: texture,
        opacity: 0.5,
        flatShading: true,
        side: THREE.FrontSide,
        transparent: true,
    });

    const materialBack = new THREE.MeshBasicMaterial({
        color: color,
        map: texture,
        opacity: 0.5,
        flatShading: true,
        side: THREE.BackSide,
        transparent: true,
    });

    // http://stackoverflow.com/questions/15514274/three-js-how-to-control-rendering-order
    const meshFront = new THREE.Mesh(geometry, materialFront);
    meshFront.renderOrder = 2;
    object.add(meshFront);

    const meshBack = new THREE.Mesh(geometry, materialBack);
    object.add(meshBack);

    return object;
};

class ToolHead {
    constructor(color, texture) {
        return buildToolHead(color, texture);
    }
}

export default ToolHead;
