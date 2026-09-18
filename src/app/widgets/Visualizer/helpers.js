import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

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

const loadSTL = (url) => new Promise(resolve => {
  new STLLoader().load(url, resolve);
});

const loadTexture = (url) => new Promise(resolve => {
  new THREE.TextureLoader().load(url, (texture) => {
    // An image file holds sRGB pixels; since colour management became the
    // default a colour map has to say so or it is taken to be linear already.
    texture.colorSpace = THREE.SRGBColorSpace;
    resolve(texture);
  });
});

export {
  getBoundingBox,
  loadSTL,
  loadTexture,
};
