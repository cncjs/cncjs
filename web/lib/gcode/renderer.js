import _ from 'lodash';
import THREE from 'three';
import GCodeParser from './parser';
import log from '../log';

function GCodeRenderer() {
    this.layers = [];
    this.baseObject = new THREE.Object3D();
    this.feedColors = {
        canteloupe: new THREE.Color(0xffcc66),
        sky: new THREE.Color(0x66ccff),
        honeydew: new THREE.Color(0x22bb22),
        carnation: new THREE.Color(0xff70cf),
        lavender: new THREE.Color(0xcc66ff),
        banana: new THREE.Color(0xfffe66),
        salmon: new THREE.Color(0xff6666),
        spindrift: new THREE.Color(0x66ffcc),
        flora: new THREE.Color(0x66ff66)
    };
    this.feed = {
        geometry: new THREE.Geometry(),
        material: new THREE.LineBasicMaterial({
            opacity: 0.8,
            transparent: true,
            linewidth: 2,
            vertexColors: THREE.VertexColors
        }),
        frameIndex: 0,
        frames: [] // e.g. [{ code: 'G1 X1', vertexIndex: 2 }]
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
    //    SprintRun source code

    let lastLine = {
        x: 0,
        y: 0,
        z: 0,
        e: 0,
        f: 0,
        // set to true for cnc, no extruder
        extruding: true
    };

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
        let color = new THREE.Color(line.extruding ? 0x33aadd : 0x228B22);

        if (layer.type[grouptype] === undefined) {
            layer.type[grouptype] = {
                type: grouptype,
                feed: line.e,
                extruding: line.extruding,
                color: color,
                segmentCount: 0,
                material: new THREE.LineBasicMaterial({
                    opacity: line.extruding ? 0.8 : 0.8,
                    transparent: true,
                    linewidth: 2,
                    vertexColors: THREE.FaceColors
                }),
                geometry: new THREE.Geometry()
            };
        }

        return layer.type[grouptype];
    }

    function addSegment(p1, p2) {
        let group = getLineGroup(p2);
        let geometry = group.geometry;

        group.segmentCount++;
        geometry.vertices.push(new THREE.Vector3(p1.x, p1.y, p1.z));
        geometry.vertices.push(new THREE.Vector3(p2.x, p2.y, p2.z));
        geometry.colors.push(group.color);
        geometry.colors.push(group.color);

        let feedColor = new THREE.Color(that.feedColors['lavender']);
        that.feed.geometry.vertices.push(new THREE.Vector3(p1.x, p1.y, p1.z));
        that.feed.geometry.vertices.push(new THREE.Vector3(p2.x, p2.y, p2.z));
        that.feed.geometry.colors.push(feedColor);
        that.feed.geometry.colors.push(feedColor);

        box.min.x = Math.min(box.min.x, p2.x);
        box.min.y = Math.min(box.min.y, p2.y);
        box.min.z = Math.min(box.min.z, p2.z);
        box.max.x = Math.max(box.max.x, p2.x);
        box.max.y = Math.max(box.max.y, p2.y);
        box.max.z = Math.max(box.max.z, p2.z);
    }

    let relative = false;

    function delta(v1, v2) {
        return relative ? v2 : v2 - v1;
    }

    function absolute(v1, v2) {
        return relative ? v1 + v2 : v2;
    }

    let parser = new GCodeParser({
        G1: (args, index) => {
            // Example: G1 Z1.0 F3000
            //          G1 X99.9948 Y80.0611 Z15.0 F1500.0 E981.64869
            //          G1 E104.25841 F1800.0
            // Go in a straight line from the current (X, Y) point
            // to the point (90.6, 13.8), extruding material as the move
            // happens from the current extruded length to a length of
            // 22.4 mm.

            let newLine = {
                x: args.x !== undefined ? absolute(lastLine.x, args.x) : lastLine.x,
                y: args.y !== undefined ? absolute(lastLine.y, args.y) : lastLine.y,
                z: args.z !== undefined ? absolute(lastLine.z, args.z) : lastLine.z,
                e: args.e !== undefined ? absolute(lastLine.e, args.e) : lastLine.e,
                f: args.f !== undefined ? absolute(lastLine.f, args.f) : lastLine.f
            };

            //if (lastLine.x == 0 && lastLine.y == 0 && lastLine.z == 0) {
            // this is the first iteration
            // don't draw 
            //	lastLine = newLine;
            //}

            /* layer change detection is or made by watching Z, it's made by
               watching when we extrude at a new Z position */
            if (delta(lastLine.e, newLine.e) > 0) {
                newLine.extruding = delta(lastLine.e, newLine.e) > 0;
                if (layer == undefined || newLine.z != layer.z) {
                    newLayer(newLine);
                }
            }
            addSegment(lastLine, newLine);
            lastLine = newLine;
        },

        G21: () => {
            // G21: Set Units to Millimeters
            // Example: G21
            // Units from now on are in millimeters. (This is the RepRap default.)

            // No-op: So long as G20 is not supported.
        },

        G90: () => {
            // G90: Set to Absolute Positioning
            // Example: G90
            // All coordinates from now on are absolute relative to the
            // origin of the machine. (This is the RepRap default.)

            relative = false;
        },

        G91: () => {
            // G91: Set to Relative Positioning
            // Example: G91
            // All coordinates from now on are relative to the last position.

            // TODO!
            relative = true;
        },

        G92: (args) => { // E0
            // G92: Set Position
            // Example: G92 E0
            // Allows programming of absolute zero point, by reseting the
            // current position to the values specified. This would set the
            // machine's X coordinate to 10, and the extrude coordinate to 90.
            // No physical motion will occur.

            // TODO: Only support E0
            let newLine = lastLine;
            newLine.x = args.x !== undefined ? args.x : newLine.x;
            newLine.y = args.y !== undefined ? args.y : newLine.y;
            newLine.z = args.z !== undefined ? args.z : newLine.z;
            newLine.e = args.e !== undefined ? args.e : newLine.e;
            lastLine = newLine;
        },

        M82: () => {
            // M82: Set E codes absolute (default)
            // Descriped in Sprintrun source code.

            // No-op, so long as M83 is not supported.
        },

        M84: () => {
            // M84: Stop idle hold
            // Example: M84
            // Stop the idle hold on all axis and extruder. In some cases the
            // idle hold causes annoying noises, which can be stopped by
            // disabling the hold. Be aware that by disabling idle hold during
            // printing, you will get quality issues. This is recommended only
            // in between or after printjobs.

            // No-op
        },

        'default': (args, info) => {
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
        let material = feed.material;
        let frame = this.feed.frames[this.feed.frameIndex] || {};

        geometry.vertices = this.feed.geometry.vertices.slice(0, frame.vertexIndex);
        geometry.colors = this.feed.geometry.colors.slice(0, frame.vertexIndex);
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
