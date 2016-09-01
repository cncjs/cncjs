import _ from 'lodash';
import colornames from 'colornames';
import THREE from 'three';
import { GCodeToolpath } from 'gcode-toolpath';
import log from '../../lib/log';

const noop = () => {};

const defaultColor = new THREE.Color(colornames('darkgray'));
const motionColor = {
    'G0': new THREE.Color(colornames('green')),
    'G1': new THREE.Color(colornames('blue')),
    'G2': new THREE.Color(colornames('deepskyblue')),
    'G3': new THREE.Color(colornames('deepskyblue'))
};

class GCodeVisualizer {
    constructor() {
        this.group = new THREE.Object3D();
        this.geometry = new THREE.Geometry();

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
    addLine(modalState, v1, v2) {
        const { motion } = modalState;
        this.geometry.vertices.push(new THREE.Vector3(v1.x, v1.y, v1.z));
        this.geometry.vertices.push(new THREE.Vector3(v2.x, v2.y, v2.z));

        let color = motionColor[motion] || defaultColor;
        this.geometry.colors.push(color);
        this.geometry.colors.push(color);
    }
    // Parameters
    //   modalState The modal state
    //   v1 The start point
    //   v2 The end point
    //   v0 The fixed point
    addArcCurve(modalState, v1, v2, v0) {
        const { motion, plane } = modalState;
        let isClockwise = (motion === 'G2');
        let radius = Math.sqrt(
            Math.pow((v1.x - v0.x), 2) + Math.pow((v1.y - v0.y), 2)
        );
        let startAngle = Math.atan2(v1.y - v0.y, v1.x - v0.x);
        let endAngle = Math.atan2(v2.y - v0.y, v2.x - v0.x);

        // Draw full circle if startAngle and endAngle are both zero
        if (startAngle === endAngle) {
            endAngle += (2 * Math.PI);
        }

        let arcCurve = new THREE.ArcCurve(
            v0.x, // aX
            v0.y, // aY
            radius, // aRadius
            startAngle, // aStartAngle
            endAngle, // aEndAngle
            isClockwise // isClockwise
        );
        let divisions = 30;
        let points = arcCurve.getPoints(divisions);
        let vertices = [];

        for (let i = 0; i < points.length; ++i) {
            let point = points[i];
            let z = ((v2.z - v1.z) / points.length) * i + v1.z;

            if (plane === 'G17') { // XY-plane
                vertices.push(new THREE.Vector3(point.x, point.y, z));
            } else if (plane === 'G18') { // ZX-plane
                vertices.push(new THREE.Vector3(point.y, z, point.x));
            } else if (plane === 'G19') { // YZ-plane
                vertices.push(new THREE.Vector3(z, point.x, point.y));
            }
        }

        let color = motionColor[motion] || defaultColor;
        let colors = _.fill(Array(vertices.length), color);

        this.geometry.vertices = this.geometry.vertices.concat(vertices);
        this.geometry.colors = this.geometry.colors.concat(colors);
    }
    render({ gcode }, callback = noop) {
        const toolpath = new GCodeToolpath({
            addLine: (modalState, v1, v2) => {
                this.addLine(modalState, v1, v2);
            },
            addArcCurve: (modalState, v1, v2, v0) => {
                this.addArcCurve(modalState, v1, v2, v0);
            }
        });

        toolpath
            .loadFromString(gcode, (err, results) => {
                this.update();

                log.debug({
                    geometry: this.geometry,
                    frames: this.frames,
                    frameIndex: this.frameIndex
                });

                callback(this.group);
            })
            .on('data', (data) => {
                this.frames.push({
                    data: data,
                    vertexIndex: this.geometry.vertices.length // remember current vertex index
                });
            });

        return this.group;
    }
    update() {
        while (this.group.children.length > 0) {
            let path = this.group.children[0];
            this.group.remove(path);
            path.geometry.dispose();
        }

        { // Main object
            let geometry = this.geometry;
            let material = new THREE.LineBasicMaterial({
                color: new THREE.Color(colornames('darkgray')),
                linewidth: 1,
                vertexColors: THREE.VertexColors,
                opacity: 0.5,
                transparent: true
            });
            this.group.add(new THREE.Line(geometry, material));
        }

        if (this.frameIndex > 0) { // Preview with frames
            let geometry = new THREE.Geometry();
            let material = new THREE.LineBasicMaterial({
                color: new THREE.Color(colornames('red')),
                linewidth: 1,
                opacity: 0.5,
                transparent: true
            });
            let currentFrame = this.frames[this.frameIndex] || {};
            geometry.vertices = this.geometry.vertices.slice(0, currentFrame.vertexIndex);
            this.group.add(new THREE.Line(geometry, material));
        }
    }
    setFrameIndex(frameIndex) {
        frameIndex = Math.min(frameIndex, this.frames.length - 1);
        frameIndex = Math.max(frameIndex, 0);

        this.frameIndex = frameIndex;
        this.update();
    }
}

export default GCodeVisualizer;
