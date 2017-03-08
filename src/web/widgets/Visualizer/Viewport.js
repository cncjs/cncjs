import * as THREE from 'three';
import log from '../../lib/log';

const FOV_MIN = 15;
const TARGET0 = new THREE.Vector3(0, 0, 0);

// https://github.com/mrdoob/three.js/issues/1454
// https://github.com/mrdoob/three.js/issues/1521
class Viewport {
    camera = null;
    width = 0;
    height = 0;
    state = {};

    constructor(camera, width, height) {
        if (!(camera instanceof THREE.CombinedCamera)) {
            log.error('This camera is not supported:', camera);
            return;
        }
        if (width <= 0 || height <= 0) {
            log.error(`Width (${width}) and height (${height}) cannot be less than or equal to zero.`);
            return;
        }

        this.camera = camera;

        this.width = width;
        this.height = height;

        this.state = {
            ...this.state,
            width: this.width,
            height: this.height,
            target: TARGET0
        };

        this.reset();
    }
    reset() {
        this.set(this.width, this.height, TARGET0);
    }
    update() {
        const { width, height, target } = this.state;
        this.set(width, height, target);
    }
    set(width, height, target = TARGET0) {
        if (!this.camera) {
            return;
        }

        this.state = {
            ...this.state,
            width,
            height,
            target
        };

        const visibleWidth = Math.abs(this.camera.right - this.camera.left);
        const visibleHeight = Math.abs(this.camera.top - this.camera.bottom);

        if (this.camera.inOrthographicMode) {
            // Orthographic Projection
            const zoom = Math.min(visibleWidth / width, visibleHeight / height);
            this.camera.setZoom(zoom);
        } else {
            // Perspective Projection
            const { x, y, z } = this.camera.position;
            const eye = new THREE.Vector3(x, y, z);
            if (!(target instanceof THREE.Vector3)) {
                target = TARGET0;
            }
            // Find the distance from the camera to the closest face of the object
            const distance = target.distanceTo(eye);
            // The aspect ratio of the canvas (width / height)
            const aspect = visibleHeight > 0 ? (visibleWidth / visibleHeight) : 1;

            // http://stackoverflow.com/questions/14614252/how-to-fit-camera-to-object
            // To match the object height with the visible height
            //   fov = 2 * Math.atan(height / (2 * dist)) * ( 180 / Math.PI); // in degrees
            // To match the object width with the visible width
            //   fov = 2 * Math.atan((width / aspect) / (2 * dist)) * (180 / Math.PI); // in degrees
            const fov = Math.max(
                // to fit the viewport height
                2 * Math.atan(height / (2 * distance)) * (180 / Math.PI),
                // to fit the viewport width
                2 * Math.atan((width / aspect) / (2 * distance)) * (180 / Math.PI)
            );

            this.camera.setFov(Math.max(fov, FOV_MIN));
        }
    }
}

export default Viewport;
