import THREE from 'three';

const buildEngravingCutter = (color, texture) => {
    let object = new THREE.Object3D();
    let geometry, materialFront, materialBack;

    const radiusTop = 2.0;
    const radiusBottom = 0.1;
    const height = 20;
    const radiusSegments = 32;
    const heightSegments = 1;
    const openEnded = false;
    const thetaStart = 0;
    const thetaLength = 2 * Math.PI;

    // Geometry
    geometry = new THREE.CylinderGeometry(
        radiusTop, radiusBottom, height, radiusSegments, heightSegments, openEnded, thetaStart, thetaLength
    );
    // Rotates the geometry 90 degrees around the X axis.
    geometry.rotateX(Math.PI / 2);
    // Set the desired position from the origin rather than its center.
    geometry.translate(0, 0, height / 2);

    // Material
    materialFront = new THREE.MeshBasicMaterial({
        color: color,
        map: texture,
        opacity: 0.5,
        shading: THREE.SmoothShading,
        side: THREE.FrontSide,
        transparent: true
    });
    materialBack = new THREE.MeshBasicMaterial({
        color: color,
        map: texture,
        opacity: 0.5,
        shading: THREE.SmoothShading,
        side: THREE.BackSide,
        transparent: true
    });

    // http://stackoverflow.com/questions/15514274/three-js-how-to-control-rendering-order
    let meshFront = new THREE.Mesh(geometry, materialFront);
    meshFront.renderOrder = 2;
    object.add(meshFront);

    let meshBack = new THREE.Mesh(geometry, materialBack);
    object.add(meshBack);

    return object;
};

class EngravingCutter {
    constructor(color, texture) {
        return buildEngravingCutter(color, texture);
    }
}

export default EngravingCutter;
