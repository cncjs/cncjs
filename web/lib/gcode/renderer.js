import _ from 'lodash';
import THREE from 'three';
import GCodeParser from './parser';
import log from '../log';
import colorNames from '../color-names';

const DEFAULT_STATE = {
    x: 0,
    y: 0,
    z: 0,
    relative: false // positioning
};

let translatePosition = (position, newPosition, relative) => {
    relative = !!relative;
    newPosition = Number(newPosition);
    if (_.isNaN(newPosition)) {
        return position;
    }
    return relative ? (position + newPosition) : newPosition;
};

class GCodeRenderer {
    constructor() {
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

        this.state = DEFAULT_STATE;
    }
    setState(newState) {
        this.state = _.assign({}, this.state, newState);
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
    translateX(x, relative) {
        if (_.isUndefined(relative)) {
            relative = this.state.relative;
        }
        return translatePosition(this.state.x, x, !!relative);
    }
    translateY(y, relative) {
        if (_.isUndefined(relative)) {
            relative = this.state.relative;
        }
        return translatePosition(this.state.y, y, !!relative);
    }
    translateZ(z, relative) {
        if (_.isUndefined(relative)) {
            relative = this.state.relative;
        }
        return translatePosition(this.state.z, z, !!relative);
    }
    render(options, callback) {
        options = _.defaults(options, {
            gcode: '',
            width: 0,
            height: 0
        });

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

        let parser = new GCodeParser({
            'G0': (opts) => {
                let { params } = opts;
                let v2 = {
                    x: this.translateX(params.x),
                    y: this.translateY(params.y),
                    z: this.translateZ(params.z)
                };
                let newState = v2;

                this.setState(newState);
            },
            // G1: Linear Move
            //
            // Usage
            //   G1 Xnnn Ynnn Znnn Ennn Fnnn Snnn
            // Parameters
            //   Xnnn The position to move to on the X axis
            //   Ynnn The position to move to on the Y axis
            //   Znnn The position to move to on the Z axis
            //   Fnnn The feedrate per minute of the move between the starting point and ending point (if supplied)
            //   Snnn Flag to check if an endstop was hit (S1 to check, S0 to ignore, S2 see note, default is S0)
            // Examples
            //   G1 X12 (move to 12mm on the X axis)
            //   G1 F1500 (Set the feedrate to 1500mm/minute)
            //   G1 X90.6 Y13.8 E22.4 (Move to 90.6mm on the X axis and 13.8mm on the Y axis while extruding 22.4mm of material)
            //
            'G1': (opts) => {
                let { params } = opts;
                let v1 = {
                    x: this.state.x,
                    y: this.state.y,
                    z: this.state.z
                };
                let v2 = {
                    x: this.translateX(params.x),
                    y: this.translateY(params.y),
                    z: this.translateZ(params.z)
                };
                let newState = v2;

                this.addLine(v1, v2);
                this.setState(newState);

                updateDimension(v1, v2);
            },

            // G2 & G3: Controlled Arc Move
            //
            // Usage
            //   G2 Xnnn Ynnn Innn Jnnn Ennn Fnnn (Clockwise Arc)
            //   G3 Xnnn Ynnn Innn Jnnn Ennn Fnnn (Counter-Clockwise Arc)
            // Parameters
            //   Xnnn The position to move to on the X axis
            //   Ynnn The position to move to on the Y axis
            //   Innn The point in X space from the current X position to maintain a constant distance from
            //   Jnnn The point in Y space from the current Y position to maintain a constant distance from
            //   Fnnn The feedrate per minute of the move between the starting point and ending point (if supplied)
            // Examples
            //   G2 X90.6 Y13.8 I5 J10 E22.4 (Move in a Clockwise arc from the current point to point (X=90.6,Y=13.8),
            //   with a center point at (X=current_X+5, Y=current_Y+10), extruding 22.4mm of material between starting and stopping)
            //   G3 X90.6 Y13.8 I5 J10 E22.4 (Move in a Counter-Clockwise arc from the current point to point (X=90.6,Y=13.8),
            //   with a center point at (X=current_X+5, Y=current_Y+10), extruding 22.4mm of material between starting and stopping)
            // Referring
            //   http://linuxcnc.org/docs/2.5/html/gcode/gcode.html#sec:G2-G3-Arc
            //   https://github.com/grbl/grbl/issues/236
            'G2': (opts) => {
                let { params } = opts;
                let isClockwise = true;
                let v1 = {
                    x: this.state.x,
                    y: this.state.y,
                    z: this.state.z
                };
                let v2 = {
                    x: this.translateX(params.x),
                    y: this.translateY(params.y),
                    z: this.translateZ(params.z)
                };
                let v0 = { // fixed point
                    x: this.translateX(params.i, true),
                    y: this.translateY(params.j, true),
                    z: this.translateZ(params.k, true)
                };
                let newState = v2;

                this.addArcCurve(v1, v2, v0, isClockwise);
                this.setState(newState);

                updateDimension(v1, v2);
            },
            'G3': (opts) => {
                let { params } = opts;
                let isClockwise = false;
                let v1 = {
                    x: this.state.x,
                    y: this.state.y,
                    z: this.state.z
                };
                let v2 = newState = {
                    x: this.translateX(params.x),
                    y: this.translateY(params.y),
                    z: this.translateZ(params.z)
                };
                let v0 = { // fixed point
                    x: this.translateX(params.i, true),
                    y: this.translateY(params.j, true),
                    z: this.translateZ(params.k, true)
                };
                let newState = v2;

                this.addArcCurve(v1, v2, v0, isClockwise);
                this.setState(newState);

                updateDimension(v1, v2);
            },
            // G90: Set to Absolute Positioning
            // Example
            //   G90
            // All coordinates from now on are absolute relative to the origin of the machine.
            'G90': (opts) => {
                this.setState({ relative: false });
            },
            // G91: Set to Relative Positioning
            // Example
            //   G91
            // All coordinates from now on are relative to the last position.
            'G91': (opts) => {
                this.setState({ relative: true });
            },
            // G92: Set Position
            // Parameters
            //   This command can be used without any additional parameters.
            //   Xnnn new X axis position
            //   Ynnn new Y axis position
            //   Znnn new Z axis position
            // Example
            //   G92 X10 E90
            // Allows programming of absolute zero point, by reseting the current position to the params specified.
            // This would set the machine's X coordinate to 10, and the extrude coordinate to 90. No physical motion will occur.
            // A G92 without coordinates will reset all axes to zero.
            'G92': (opts) => {
                let { params } = opts;
                let v2 = {
                    x: this.translateX(params.x),
                    y: this.translateY(params.y),
                    z: this.translateZ(params.z)
                };
                let newState = v2;

                this.setState(newState);
            }
        });

        parser.parse(gcode, (line, index) => {
            this.frames.push({
                code: line,
                vertexIndex: this.vertices.length // remember current vertex index
            });
        });

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

        _.isFunction(callback) && callback(this.baseObject, {
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
