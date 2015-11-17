import _ from 'lodash';
import THREE from 'three';
import GCodeParser from './parser';
import log from '../log';
import colorNames from '../color-names';

function GCodeRenderer() {
    this.layers = [];
    this.baseObject = new THREE.Object3D();
    this.feed = {
        geometry: new THREE.Geometry(),
        frameIndex: 0,
        frames: [] // e.g. [{ code: 'G1 X1', vertexIndex: 2 }]
    };
    this.state = {
        x: 0,
        y: 0,
        z: 0,
        e: 0,
        f: 0,
        // set to true for cnc, no extruder
        extruding: true,
        // positioning
        relative: false
    };
    this.setState = (newState) => {
        this.state = _.assign({}, this.state, newState);
    };
    this.resetState = () => {
        this.setState({
            x: 0,
            y: 0,
            z: 0,
            e: 0,
            f: 0,
            extruding: true,
            relative: false
        });
    };
    this.delta = (v1, v2) => {
        return this.state.relative ? v2 : v2 - v1;
    };
    this.absolute = (v1, v2) => {
        return this.state.relative ? v1 + v2 : v2;
    };
}

GCodeRenderer.prototype.render = function(options, callback) {
    let that = this;

    options = _.defaults(options, {
        gcode: '',
        width: 0,
        height: 0
    });

    let { gcode, width, height } = options;

    // GCode descriptions come from:
    //    http://reprap.org/wiki/G-code
    //    http://en.wikipedia.org/wiki/G-code

    let layer = undefined;
    let box = {
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

    function newLayer(line) {
        layer = {
            type: {},
            layer: that.layers.length,
            z: line.z
        };
        that.layers.push(layer);
    }

    function getLineGroup(line) {
        if (layer === undefined) {
            newLayer(line);
        }
        let speed = Math.round(line.e / 1000);
        let grouptype = (line.extruding ? 10000 : 0) + speed;
        let color = new THREE.Color(line.extruding ? colorNames.darkcyan : colorNames.darkgreen);

        if (layer.type[grouptype] === undefined) {
            layer.type[grouptype] = {
                type: grouptype,
                feed: line.e,
                extruding: line.extruding,
                color: color,
                segmentCount: 0,
                material: new THREE.LineBasicMaterial({
                    linewidth: 2,
                    color: line.extruding ? colorNames.darkcyan : colorNames.darkgreen
                }),
                geometry: new THREE.Geometry()
            };
        }

        return layer.type[grouptype];
    }

    function addLineSegment(p1, p2) {
        let group = getLineGroup(p2);
        let geometry = group.geometry;

        group.segmentCount++;
        geometry.vertices.push(new THREE.Vector3(p1.x, p1.y, p1.z));
        geometry.vertices.push(new THREE.Vector3(p2.x, p2.y, p2.z));

        that.feed.geometry.vertices.push(new THREE.Vector3(p1.x, p1.y, p1.z));
        that.feed.geometry.vertices.push(new THREE.Vector3(p2.x, p2.y, p2.z));

        box.min.x = Math.min(box.min.x, p2.x);
        box.min.y = Math.min(box.min.y, p2.y);
        box.min.z = Math.min(box.min.z, p2.z);
        box.max.x = Math.max(box.max.x, p2.x);
        box.max.y = Math.max(box.max.y, p2.y);
        box.max.z = Math.max(box.max.z, p2.z);
    }

    // Parameters
    //   p1 The start point
    //   p2 The end point
    //   p0 The fixed point
    function addArcCurveSegment(p1, p2, p0, isClockwise) {
        let group = getLineGroup(p2);
        let geometry = group.geometry;

        let radius = Math.sqrt(
            Math.pow((p1.x - p0.x), 2) + Math.pow((p1.y - p0.y), 2)
        );
        let arcCurve = new THREE.ArcCurve(
            p0.x, // aX
            p0.y, // aY
            radius, // aRadius
            Math.atan2(p1.y - p0.y, p1.x - p0.x), // aStartAngle
            Math.atan2(p2.y - p0.y, p2.x - p0.x), // aEndAngle
            !!isClockwise // isClockwise
        );
        let vertices = arcCurve.getPoints(100);

        group.segmentCount++;

        geometry.vertices = geometry.vertices.concat(vertices);
        that.feed.geometry.vertices = that.feed.geometry.vertices.concat(vertices);

        box.min.x = Math.min(box.min.x, p2.x);
        box.min.y = Math.min(box.min.y, p2.y);
        box.min.z = Math.min(box.min.z, p2.z);
        box.max.x = Math.max(box.max.x, p2.x);
        box.max.y = Math.max(box.max.y, p2.y);
        box.max.z = Math.max(box.max.z, p2.z);
    }

    let parser = new GCodeParser({
        // G1: Linear Move
        //
        // Usage
        //   G1 Xnnn Ynnn Znnn Ennn Fnnn Snnn
        // Parameters
        //   Xnnn The position to move to on the X axis
        //   Ynnn The position to move to on the Y axis
        //   Znnn The position to move to on the Z axis
        //   Ennn The amount to extrude between the starting point and ending point
        //   Fnnn The feedrate per minute of the move between the starting point and ending point (if supplied)
        //   Snnn Flag to check if an endstop was hit (S1 to check, S0 to ignore, S2 see note, default is S0)
        // Examples
        //   G1 X12 (move to 12mm on the X axis)
        //   G1 F1500 (Set the feedrate to 1500mm/minute)
        //   G1 X90.6 Y13.8 E22.4 (Move to 90.6mm on the X axis and 13.8mm on the Y axis while extruding 22.4mm of material)
        //
        'G1': (opts) => {
            let { params } = opts;
            let newState = {
                x: params.x !== undefined ? this.absolute(this.state.x, params.x) : this.state.x,
                y: params.y !== undefined ? this.absolute(this.state.y, params.y) : this.state.y,
                z: params.z !== undefined ? this.absolute(this.state.z, params.z) : this.state.z,
                e: params.e !== undefined ? this.absolute(this.state.e, params.e) : this.state.e,
                f: params.f !== undefined ? this.absolute(this.state.f, params.f) : this.state.f
            };

            // layer change detection is or made by watching Z, it's made by
            // watching when we extrude at a new Z position
            if (this.delta(this.state.e, newState.e) > 0) {
                newState.extruding = this.delta(this.state.e, newState.e) > 0;
                if (_.isUndefined(layer) || newState.z !== layer.z) {
                    newLayer(newState);
                }
            }

            addLineSegment(this.state, newState);

            this.setState(newState);
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
        //   Ennn The amount to extrude between the starting point and ending point
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
            let newState = {
                x: params.x !== undefined ? this.absolute(this.state.x, params.x) : this.state.x,
                y: params.y !== undefined ? this.absolute(this.state.y, params.y) : this.state.y,
                z: params.z !== undefined ? this.absolute(this.state.z, params.z) : this.state.z,
                f: params.f !== undefined ? this.absolute(this.state.f, params.f) : this.state.f
            };

            let p0 = { // The fixed point
                x: this.state.x + Number(params.i || 0),
                y: this.state.y + Number(params.j || 0),
                z: this.state.z + Number(params.k || 0)
            };
            let isClockwise = true;

            addArcCurveSegment(this.state, newState, p0, isClockwise);

            this.setState(newState);
        },
        'G3': (opts) => {
            let { params } = opts;
            let newState = {
                x: params.x !== undefined ? this.absolute(this.state.x, params.x) : this.state.x,
                y: params.y !== undefined ? this.absolute(this.state.y, params.y) : this.state.y,
                z: params.z !== undefined ? this.absolute(this.state.z, params.z) : this.state.z,
                f: params.f !== undefined ? this.absolute(this.state.f, params.f) : this.state.f
            };

            let p0 = { // The fixed point
                x: this.state.x + Number(params.i || 0),
                y: this.state.y + Number(params.j || 0),
                z: this.state.z + Number(params.k || 0)
            };
            let isClockwise = false;

            addArcCurveSegment(this.state, newState, p0, isClockwise);

            this.setState(newState);
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
        //   Ennn new extruder position
        // Example
        //   G92 X10 E90
        // Allows programming of absolute zero point, by reseting the current position to the params specified.
        // This would set the machine's X coordinate to 10, and the extrude coordinate to 90. No physical motion will occur.
        // A G92 without coordinates will reset all axes to zero.
        'G92': (opts) => {
            let { params } = opts;
            let newState = {
                x: (params.x !== undefined) ? params.x : this.state.x,
                y: (params.y !== undefined) ? params.y : this.state.y,
                z: (params.z !== undefined) ? params.z : this.state.z,
                e: (params.e !== undefined) ? params.e : this.state.e
            };
            this.setState(newState);
        }
    });

    parser.parse(gcode, (line, index) => {
        that.feed.frames.push({
            code: line,
            vertexIndex: that.feed.geometry.vertices.length // remember current vertex index
        });
    });

    this._update();

    if (_.size(this.feed.frames) === 0) {
        box.min.x = box.min.y = box.min.z = 0;
        box.max.x = box.max.y = box.max.z = 0;
    }

    let dX = box.max.x - box.min.x;
    let dY = box.max.y - box.min.y;
    let dZ = box.max.z - box.min.z;

    log.debug('GCodeRenderer.render:', {
        layers: this.layers,
        feed: this.feed,
        dimension: {
            dX: dX,
            dY: dY,
            dZ: dZ
        }
    });

    // take max X and Y and scale them to fit in #renderArea
    let scaleX = width / dX;
    let scaleY = height / dY;
    let scale = 1;

    if (scaleX < 1 && scaleY < 1) {
        // both less than 1, take smaller
        scale = Math.min(scaleX, scaleY);
    } else if (scaleX > 1 && scaleY > 1) {
        // both larger than 1, take larger
        scale = Math.max(scaleX, scaleY);
    } else {
        // zoom out
        scale = Math.min(scaleX, scaleY);
    }
    scale = scale / 3;

    let center = new THREE.Vector3(
        box.min.x + ((box.max.x - box.min.x) / 2),
        box.min.y + ((box.max.y - box.min.y) / 2),
        box.min.z + ((box.max.z - box.min.z) / 2)
    );
    center = center.multiplyScalar(scale);

    // set position
    this.baseObject.translateX(-center.x);
    this.baseObject.translateY(-center.y);

    this.baseObject.visible = true;

    this.baseObject.scale.multiplyScalar(scale);

    if (_.isFunction(callback)) {
        callback({
            min: {
                x: box.min.x,
                y: box.min.y,
                z: box.min.z
            },
            max: {
                x: box.max.x,
                y: box.max.y,
                z: box.max.z
            },
            delta: {
                x: dX,
                y: dY,
                z: dZ
            }
        });
    }

    return this.baseObject;
};

GCodeRenderer.prototype._update = function() {
    let that = this;
    let baseObject = this.baseObject;
    let layers = this.layers;
    let feed = this.feed;

    while (baseObject.children.length > 0 ) {
        baseObject.remove(baseObject.children[0]);
    }

    { // Preview
        _.each(layers, (layer) => {
            _.each(layer.type, (type) => {
                let { geometry, material } = type;
                log.trace('layer ' + layer.layer + ': type=' + type.type + ' segmentCount=' + type.segmentCount);
                baseObject.add(new THREE.Line(geometry, material, THREE.LineStrip));
            });
        });
    }

    { // Running Frames
        let geometry = new THREE.Geometry();
        let material = new THREE.LineBasicMaterial({
            color: colorNames.brown,
            linewidth: 2
        });
        let frame = this.feed.frames[this.feed.frameIndex] || {};
        geometry.vertices = this.feed.geometry.vertices.slice(0, frame.vertexIndex);
        baseObject.add(new THREE.Line(geometry, material));

        log.trace(frame);
    }
};

GCodeRenderer.prototype.setFrameIndex = function(frameIndex) {
    frameIndex = Math.min(frameIndex, this.feed.frames.length - 1);
    frameIndex = Math.max(frameIndex, 0);

    this.feed.frameIndex = frameIndex;

    this._update();
};

export default GCodeRenderer;
