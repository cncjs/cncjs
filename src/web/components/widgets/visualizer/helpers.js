import _ from 'lodash';
import THREE from 'three';

// Fits camera to object
// @param {number} width The object width
// @param {number} height The object height
// @param {THREE.Vector3} [lookTarget] The object's top position which is nearest to the camera
//
// http://stackoverflow.com/questions/14614252/how-to-fit-camera-to-object
//
// To match the object height with the visible height
//   fov = 2 * Math.atan(height / (2 * dist)) * ( 180 / Math.PI); // in degrees
//
// To match the object width with the visible width
//   fov = 2 * Math.atan((width / aspect) / (2 * dist)) * (180 / Math.PI); // in degrees
//
export const fitCameraToObject = (camera, width, height, lookTarget) => {
    const FOV = 15;

    console.assert(_.isNumber(width));
    console.assert(_.isNumber(height));
    console.assert(lookTarget instanceof THREE.Vector3);

    let v1 = (lookTarget instanceof THREE.Vector3) ? lookTarget : new THREE.Vector3(0, 0, 0);
    let v2 = new THREE.Vector3(
        camera.position.x,
        camera.position.y,
        camera.position.z
    );
    let dist = v1.distanceTo(v2); // the distance from the camera to the closest face of the object
    let aspect = camera.aspect; // the aspect ratio of the canvas (width / height)

    width = Number(width) || 0;
    height = Number(height) || 0;

    // Find the largest value of fov
    let fov = _.max([
        // to fit the object height
        2 * Math.atan(height / (2 * dist)) * (180 / Math.PI),
        // to fit the object width
        2 * Math.atan((width / aspect) / (2 * dist)) * (180 / Math.PI),
        // a minimum value of fov
        FOV
    ]);

    camera.fov = fov;
    camera.updateProjectionMatrix();
};

export const getBoundingBox = (object) => {
    const box = new THREE.Box3().setFromObject(object);
    const boundingBox = {
        min: {
            x: box.min.x === Infinity ? 0 : box.min.x,
            y: box.min.y === Infinity ? 0 : box.min.y,
            z: box.min.z === Infinity ? 0 : box.min.z
        },
        max: {
            x: box.max.x === -Infinity ? 0 : box.max.x,
            y: box.max.y === -Infinity ? 0 : box.max.y,
            z: box.max.z === -Infinity ? 0 : box.max.z
        }
    };

    return boundingBox;
};

export const loadTexture = (url, callback) => {
    callback = callback || ((err, texture) => {});

    const onLoad = (texture) => {
        callback(null, texture);
    };
    const onProgress = (xhr) => {
        // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    };
    const onError = (xhr) => {
        callback(new Error('Failed to load texture with the url ' + JSON.stringify(url)));
    };

    let loader = new THREE.TextureLoader();
    loader.load(url, onLoad, onProgress, onError);
};

export {
    fitCameraToObject,
    getBoundingBox,
    loadTexture
};
