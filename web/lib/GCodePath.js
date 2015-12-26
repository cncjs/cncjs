import _ from 'lodash';
import colornames from 'colornames';
import THREE from 'three';
import GCodeRunner from './GCodeRunner';
import log from './log';

const noop = () => {};

const defaultColor = new THREE.Color(colornames('darkgray'));
const vertexColor = {
    'G0': new THREE.Color('#77f777'),
    'G1': new THREE.Color('#7777f7'),
    'G2': new THREE.Color('#77ccf7'),
    'G3': new THREE.Color('#77ccf7')
};

class GCodePath {
    constructor(options) {
        options = options || {};

        log.debug('GCodePath:', options);

        this.options = options;

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
    drawLine(type, v1, v2) {
        this.geometry.vertices.push(new THREE.Vector3(v1.x, v1.y, v1.z));
        this.geometry.vertices.push(new THREE.Vector3(v2.x, v2.y, v2.z));

        let color = vertexColor[type] || defaultColor;
        this.geometry.colors.push(color);
        this.geometry.colors.push(color);
    }
    // Parameters
    //   v1 The start point
    //   v2 The end point
    //   v0 The fixed point
    drawArcCurve(type, v1, v2, v0) {
        let isClockwise = (type === 'G2');
        let radius = Math.sqrt(
            Math.pow((v1.x - v0.x), 2) + Math.pow((v1.y - v0.y), 2)
        );
        let startAngle = Math.atan2(v1.y - v0.y, v1.x - v0.x);
        let endAngle = Math.atan2(v2.y - v0.y, v2.x - v0.x);
        let arcCurve = new THREE.ArcCurve(
            v0.x, // aX
            v0.y, // aY
            radius, // aRadius
            startAngle, // aStartAngle
            endAngle, // aEndAngle
            !!isClockwise // isClockwise
        );
        let divisions = 30;
        let points = arcCurve.getPoints(divisions);
        let vertices = [];

        for (let i = 0; i < points.length; ++i) {
            let point = points[i];
            let z = ((v2.z - v1.z) / points.length) * i + v1.z;
            vertices.push(new THREE.Vector3(point.x, point.y, z));
        }

        let color = vertexColor[type] || defaultColor;
        let colors = _.fill(Array(vertices.length), color);

        this.geometry.vertices = this.geometry.vertices.concat(vertices);
        this.geometry.colors = this.geometry.colors.concat(colors);
    }
    render(options, callback) {
        options = options || {};
        callback = _.isFunction(callback) ? callback : noop;

        let runner = new GCodeRunner({
            modalState: this.options.modalState,
            drawLine: (type, v1, v2) => {
                this.drawLine(type, v1, v2);
            },
            drawArcCurve: (type, v1, v2, v0) => {
                this.drawArcCurve(type, v1, v2, v0);
            }
        });
        runner.on('data', (data) => {
            this.frames.push({
                data: data,
                vertexIndex: this.geometry.vertices.length // remember current vertex index
            });
        });

        runner.interpretText(options.gcode, (err, results) => {
            this.update();

            log.debug({
                geometry: this.geometry,
                frames: this.frames,
                frameIndex: this.frameIndex
            });

            callback(this.group);
        });
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
                opacity: 0.7,
                transparent: true
            });
            this.group.add(new THREE.Line(geometry, material));
        }

        { // Preview with frames
            let geometry = new THREE.Geometry();
            let material = new THREE.LineBasicMaterial({
                color: new THREE.Color(colornames('crimson')),
                linewidth: 1,
                opacity: 0.7,
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

export default GCodePath;
