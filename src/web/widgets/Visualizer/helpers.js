import * as THREE from 'three';

const getBoundingBox = (object) => {
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

const loadTexture = (url, callback) => {
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

    const loader = new THREE.TextureLoader();
    loader.load(url, onLoad, onProgress, onError);
};

export {
    getBoundingBox,
    loadTexture
};
