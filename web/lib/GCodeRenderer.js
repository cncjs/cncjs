import _ from 'lodash';
import THREE from 'three';
import GCodeRunner from './GCodeRunner';
import colorNames from './color-names';
import log from './log';

const noop = () => {};

class GCodeRenderer {
    constructor(options) {
        options = options || {};

        // G-code modal state
        this.modalState = _.extend({}, options.modalState);

        this.baseObject = new THREE.Object3D();

        this.vertices = [];

        // Example
        // [
        //   {
        //     code: 'G1 X1',
        //     vertexIndex: 2
        //   }
        // ]
        this.frames = []; // Example
        this.frameIndex = 0;
    }
    addLine(v1, v2) {
        this.vertices.push(new THREE.Vector3(v1.x, v1.y, v1.z));
        this.vertices.push(new THREE.Vector3(v2.x, v2.y, v2.z));
    }
    // Parameters
    //   v1 The start point
    //   v2 The end point
    //   v0 The fixed point
    addArcCurve(v1, v2, v0, isClockwise) {
        let radius = Math.sqrt(
            Math.pow((v1.x - v0.x), 2) + Math.pow((v1.y - v0.y), 2)
        );
        let arcCurve = new THREE.ArcCurve(
            v0.x, // aX
            v0.y, // aY
            radius, // aRadius
            Math.atan2(v1.y - v0.y, v1.x - v0.x), // aStartAngle
            Math.atan2(v2.y - v0.y, v2.x - v0.x), // aEndAngle
            !!isClockwise // isClockwise
        );
        let divisions = 100;
        let vertices = _.map(arcCurve.getPoints(divisions), (point) => {
            return new THREE.Vector3(point.x, point.y, v2.z); // FIXME: Now it can only move along the Z axis
        });

        this.vertices = this.vertices.concat(vertices);
    }
    render(options, callback) {
        options = _.defaults(options, {
            gcode: '',
            width: 0,
            height: 0
        });
        callback = _.isFunction(callback) ? callback : noop;

        let { gcode, width, height } = options;
        let dimension = {
            min: {
                x: Number.MAX_SAFE_INTEGER,
                y: Number.MAX_SAFE_INTEGER,
                z: Number.MAX_SAFE_INTEGER
            },
            max: {
                x: Number.MIN_SAFE_INTEGER,
                y: Number.MIN_SAFE_INTEGER,
                z: Number.MIN_SAFE_INTEGER
            }
        };

        let updateDimension = (v1, v2) => {
            dimension.min.x = _.min([dimension.min.x, v1.x, v2.x]);
            dimension.min.y = _.min([dimension.min.y, v1.y, v2.y]);
            dimension.min.z = _.min([dimension.min.z, v1.z, v2.z]);
            dimension.max.x = _.max([dimension.max.x, v1.x, v2.x]);
            dimension.max.y = _.max([dimension.max.y, v1.y, v2.y]);
            dimension.max.z = _.max([dimension.max.z, v1.z, v2.z]);
        };

        let runner = new GCodeRunner({
            modalState: this.modalState,
            addLine: (v1, v2) => {
                this.addLine(v1, v2);
                updateDimension(v1, v2);
            },
            addArcCurve: (v1, v2, v0, isClockwise) => {
                this.addArcCurve(v1, v2, v0, isClockwise);
                updateDimension(v1, v2);
            }
        });
        runner.on('data', (data) => {
            this.frames.push({
                data: data,
                vertexIndex: this.vertices.length // remember current vertex index
            });
        });

        runner.interpretText(gcode, (err, results) => {
            this.update();

            if (_.size(this.frames) === 0) {
                dimension.min.x = dimension.min.y = dimension.min.z = 0;
                dimension.max.x = dimension.max.y = dimension.max.z = 0;
            }

            log.debug('GCodeRenderer.render:', {
                vertices: this.vertices,
                frames: this.frames,
                frameIndex: this.frameIndex,
                dimension: dimension
            });

            let dX = dimension.max.x - dimension.min.x;
            let dY = dimension.max.y - dimension.min.y;
            let dZ = dimension.max.z - dimension.min.z;

            callback(this.baseObject, {
                min: {
                    x: dimension.min.x,
                    y: dimension.min.y,
                    z: dimension.min.z
                },
                max: {
                    x: dimension.max.x,
                    y: dimension.max.y,
                    z: dimension.max.z
                },
                delta: {
                    x: dX,
                    y: dY,
                    z: dZ
                }
            });
        });
    }
    update() {
        while (this.baseObject.children.length > 0) {
            this.baseObject.remove(this.baseObject.children[0]);
        }

        { // Main object
            let geometry = new THREE.Geometry();
            let material = new THREE.LineBasicMaterial({
                color: colorNames.darkgreen,
                linewidth: 2
            });
            geometry.vertices = this.vertices;
            this.baseObject.add(new THREE.Line(geometry, material));
        }

        { // Preview with frames
            let geometry = new THREE.Geometry();
            let material = new THREE.LineBasicMaterial({
                color: colorNames.brown,
                linewidth: 2
            });
            let currentFrame = this.frames[this.frameIndex] || {};
            geometry.vertices = this.vertices.slice(0, currentFrame.vertexIndex);
            this.baseObject.add(new THREE.Line(geometry, material));
        }
    }
    setFrameIndex(frameIndex) {
        frameIndex = Math.min(frameIndex, this.frames.length - 1);
        frameIndex = Math.max(frameIndex, 0);

        this.frameIndex = frameIndex;
        this.update();
    }
}

export default GCodeRenderer;
