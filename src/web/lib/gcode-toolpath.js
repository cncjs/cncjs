import _ from 'lodash';
import { GCodeInterpreter } from 'gcode-interpreter';
import { in2mm } from './units';

// noop
const noop = () => {};

const translatePosition = (position, newPosition, relative) => {
    relative = !!relative;
    newPosition = Number(newPosition);
    if (_.isNaN(newPosition)) {
        return position;
    }
    return relative ? (position + newPosition) : newPosition;
};

class GCodeToolpath {
    position = {
        x: 0,
        y: 0,
        z: 0
    };

    // https://github.com/grbl/grbl/wiki/Configuring-Grbl-v0.9
    // Also see "../constants/modal-groups.js"
    modalState = {
        motion: 'G0', // G0, G1, G2, G3, G38.2, G38.3, G38.4, G38.5, G80
        coordinate: 'G54', // G54, G55, G56, G57, G58, G59
        plane: 'G17', // G17: xy-plane, G18: xz-plane, G19: yz-plane
        units: 'G21', // G20: Inches, G21: Millimeters
        distance: 'G90', // G90: Absolute, G91: Relative
        feedrate: 'G94', // G93: Inverse Time Mode, G94: Units Per Minutes
        program: 'M0',
        spindle: 'M5',
        coolant: 'M9'
    };

    handlers = {
        // G0: Rapid Linear Move
        'G0': (params) => {
            this.setModalState({ 'motion': 'G0' });

            let v1 = {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            };
            let v2 = {
                x: this.translateX(params.X),
                y: this.translateY(params.Y),
                z: this.translateZ(params.Z)
            };
            const targetPosition = { x: v2.x, y: v2.y, z: v2.z };

            this.fn.addLine(this.modalState, v1, v2);

            // Update position
            this.setPosition(targetPosition.x, targetPosition.y, targetPosition.z);
        },
        // G1: Linear Move
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
        'G1': (params) => {
            this.setModalState({ 'motion': 'G1' });

            let v1 = {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            };
            let v2 = {
                x: this.translateX(params.X),
                y: this.translateY(params.Y),
                z: this.translateZ(params.Z)
            };
            const targetPosition = { x: v2.x, y: v2.y, z: v2.z };

            this.fn.addLine(this.modalState, v1, v2);

            // Update position
            this.setPosition(targetPosition.x, targetPosition.y, targetPosition.z);
        },
        // G2 & G3: Controlled Arc Move
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
        'G2': (params) => {
            this.setModalState({ 'motion': 'G2' });

            let v1 = {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            };
            let v2 = {
                x: this.translateX(params.X),
                y: this.translateY(params.Y),
                z: this.translateZ(params.Z)
            };
            let v0 = { // fixed point
                x: this.translateI(params.I),
                y: this.translateJ(params.J),
                z: this.translateK(params.K)
            };
            const isClockwise = true;
            const targetPosition = { x: v2.x, y: v2.y, z: v2.z };

            if (this.isXYPlane()) { // xy-plane
                [ v1.x, v1.y, v1.z ] = [ v1.x, v1.y, v1.z ];
                [ v2.x, v2.y, v2.z ] = [ v2.x, v2.y, v2.z ];
                [ v0.x, v0.y, v0.z ] = [ v0.x, v0.y, v0.z ];
            } else if (this.isXZPlane()) { // xz-plane
                [ v1.x, v1.y, v1.z ] = [ v1.x, v1.z, v1.y ];
                [ v2.x, v2.y, v2.z ] = [ v2.x, v2.z, v2.y ];
                [ v0.x, v0.y, v0.z ] = [ v0.x, v0.z, v0.y ];
            } else if (this.isYZPlane()) { // yz-plane
                [ v1.x, v1.y, v1.z ] = [ v1.y, v1.z, v1.x ];
                [ v2.x, v2.y, v2.z ] = [ v2.y, v2.z, v2.x ];
                [ v0.x, v0.y, v0.z ] = [ v0.y, v0.z, v0.x ];
            } else {
                console.error('The plane mode is invalid', this.modalState.plane);
                return;
            }

            if (params.R) {
                let radius = this.translateR(params.R);
                let x = v2.x - v1.x;
                let y = v2.y - v1.y;
                let distance = Math.sqrt(x * x + y * y);
                let height = Math.sqrt(4 * radius * radius - x * x - y * y) / 2;

                if (isClockwise) {
                    height = -height;
                }
                if (radius < 0) {
                    height = -height;
                }

                let offsetX = x / 2 - y / distance * height;
                let offsetY = y / 2 + x / distance * height;

                v0.x = v1.x + offsetX;
                v0.y = v1.y + offsetY;
            }

            this.fn.addArcCurve(this.modalState, v1, v2, v0);

            // Update position
            this.setPosition(targetPosition.x, targetPosition.y, targetPosition.z);
        },
        'G3': (params) => {
            this.setModalState({ 'motion': 'G3' });

            let v1 = {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            };
            let v2 = {
                x: this.translateX(params.X),
                y: this.translateY(params.Y),
                z: this.translateZ(params.Z)
            };
            let v0 = { // fixed point
                x: this.translateI(params.I),
                y: this.translateJ(params.J),
                z: this.translateK(params.K)
            };
            const isClockwise = false;
            const targetPosition = { x: v2.x, y: v2.y, z: v2.z };

            if (this.isXYPlane()) { // xy-plane
                [ v1.x, v1.y, v1.z ] = [ v1.x, v1.y, v1.z ];
                [ v2.x, v2.y, v2.z ] = [ v2.x, v2.y, v2.z ];
                [ v0.x, v0.y, v0.z ] = [ v0.x, v0.y, v0.z ];
            } else if (this.isXZPlane()) { // xz-plane
                [ v1.x, v1.y, v1.z ] = [ v1.x, v1.z, v1.y ];
                [ v2.x, v2.y, v2.z ] = [ v2.x, v2.z, v2.y ];
                [ v0.x, v0.y, v0.z ] = [ v0.x, v0.z, v0.y ];
            } else if (this.isYZPlane()) { // yz-plane
                [ v1.x, v1.y, v1.z ] = [ v1.y, v1.z, v1.x ];
                [ v2.x, v2.y, v2.z ] = [ v2.y, v2.z, v2.x ];
                [ v0.x, v0.y, v0.z ] = [ v0.y, v0.z, v0.x ];
            } else {
                console.error('The plane mode is invalid', this.modalState.plane);
                return;
            }

            if (params.R) {
                let radius = this.translateR(Number(params.R) || 0);
                let x = v2.x - v1.x;
                let y = v2.y - v1.y;
                let distance = Math.sqrt(x * x + y * y);
                let height = Math.sqrt(4 * radius * radius - x * x - y * y) / 2;

                if (isClockwise) {
                    height = -height;
                }
                if (radius < 0) {
                    height = -height;
                }

                let offsetX = x / 2 - y / distance * height;
                let offsetY = y / 2 + x / distance * height;

                v0.x = v1.x + offsetX;
                v0.y = v1.y + offsetY;
            }

            this.fn.addArcCurve(this.modalState, v1, v2, v0);

            // Update position
            this.setPosition(targetPosition.x, targetPosition.y, targetPosition.z);
        },
        // G4: Dwell
        // Parameters
        //   Pnnn Time to wait, in milliseconds
        //   Snnn Time to wait, in seconds (Only on Marlin and Smoothie)
        // Example
        //   G4 P200
        'G4': (params) => {
            let sleep = 0;
            
            if (typeof params.S !== 'undefined') {
                sleep = Number(params.S) * 1000; // seconds
            }

            if (typeof params.P !== 'undefined') {
                sleep = Number(params.P); // milliseconds
            }
        },
        // G10: Coordinate System Data Tool and Work Offset Tables
        'G10': (params) => {
        },
        // G17..19: Plane Selection
        // G17: XY (default)
        'G17': (params) => {
            this.setModalState({ 'plane': 'G17' });
        },
        // G18: XZ
        'G18': (params) => {
            this.setModalState({ 'plane': 'G18' });
        },
        // G19: YZ
        'G19': (params) => {
            this.setModalState({ 'plane': 'G19' });
        },
        // G20: use inches for length units 
        'G20': (params) => {
            this.setModalState({ 'units': 'G20' });
        },
        // G21: use millimeters for length units
        'G21': (params) => {
            this.setModalState({ 'units': 'G21' });
        },
        // G38.x Straight Probe
        // G38.2 probe toward workpiece, stop on contact, signal error if failure
        'G38.2': (params) => {
            this.setModalState({ 'motion': 'G38.2' });
        },
        // G38.3 probe toward workpiece, stop on contact
        'G38_3': (params) => {
            this.setModalState({ 'motion': 'G38.3' });
        },
        // G38.4 probe away from workpiece, stop on loss of contact, signal error if failure
        'G38.4': (params) => {
            this.setModalState({ 'motion': 'G38.4' });
        },
        // G38.5 probe away from workpiece, stop on loss of contact
        'G38.5': (params) => {
            this.setModalState({ 'motion': 'G38.5' });
        },
        // G54..59: Coordinate System Select
        'G54': () => {
            this.setModalState({ 'coordinate': 'G54' });
        },
        'G55': () => {
            this.setModalState({ 'coordinate': 'G55' });
        },
        'G56': () => {
            this.setModalState({ 'coordinate': 'G56' });
        },
        'G57': () => {
            this.setModalState({ 'coordinate': 'G57' });
        },
        'G58': () => {
            this.setModalState({ 'coordinate': 'G58' });
        },
        'G59': () => {
            this.setModalState({ 'coordinate': 'G59' });
        },
        // G80: Cancel Canned Cycle
        'G80': () => {
            this.setModalState({ 'motion': 'G80' });
        },
        // G90: Set to Absolute Positioning
        // Example
        //   G90
        // All coordinates from now on are absolute relative to the origin of the machine.
        'G90': () => {
            this.setModalState({ 'distance': 'G90' });
        },
        // G91: Set to Relative Positioning
        // Example
        //   G91
        // All coordinates from now on are relative to the last position.
        'G91': () => {
            this.setModalState({ 'distance': 'G91' });
        },
        // G92: Set Position
        // Parameters
        //   This command can be used without any additional parameters.
        //   Xnnn new X axis position
        //   Ynnn new Y axis position
        //   Znnn new Z axis position
        // Example
        //   G92 X10
        // Allows programming of absolute zero point, by reseting the current position to the params specified.
        // This would set the machine's X coordinate to 10. No physical motion will occur.
        // A G92 without coordinates will reset all axes to zero.
        'G92': (params) => {
            let v2 = {
                x: this.translateX(params.X, false),
                y: this.translateY(params.Y, false),
                z: this.translateZ(params.Z, false)
            };

            // A G92 without coordinates will reset all axes to zero.
            if (_.isUndefined(params.X) && _.isUndefined(params.Y) && _.isUndefined(params.Z)) {
                v2.x = v2.y = v2.z = 0;
            }
     
            // Update position
            this.setPosition(v2.x, v2.y, v2.z);
        },
        // G93: start the inverse time mode
        // In inverse time feed rate mode, an F word means the move should be completed in
        // [one divided by the F number] minutes.
        // For example, if the F number is 2.0, the move should be completed in half a minute.
        'G93': () => {
            this.setModalState({ 'feedrate': 'G93' });
        },
        // G94: start the units per minute mode
        // In units per minute feed rate mode, an F word on the line is interpreted to
        // mean the controlled point should move at a certain number of inches per minute,
        // millimeters per minute or degrees per minute, depending upon what length units
        // are being used and which axis or axes are moving.
        'G94': () => {
            this.setModalState({ 'feedrate': 'G94' });
        }
    };

    // @param {object} [options]
    // @param {object} [options.modalState]
    // @param {function} [options.addLine]
    // @param {function} [options.addArcCurve]
    constructor(options) {
        options = options || {};

        this.modalState = _.extend({},
            this.modalState,
            _.pick(options.modalState, _.keys(this.modalState))
        );

        this.fn = {
            addLine: options.addLine || noop,
            addArcCurve: options.addArcCurve || noop
        };

        return new GCodeInterpreter({ handlers: this.handlers });
    }
    isMetricUnits() { // mm
        return this.modalState.units === 'G21';
    }
    isImperialUnits() { // inch
        return this.modalState.units === 'G20';
    }
    isAbsoluteDistance() {
        return this.modalState.distance === 'G90';
    }
    isRelativeDistance() {
        return this.modalState.distance === 'G91';
    }
    isXYPlane() {
        return this.modalState.plane === 'G17';
    }
    isXZPlane() {
        return this.modalState.plane === 'G18';
    }
    isYZPlane() {
        return this.modalState.plane === 'G19';
    }
    isInverseTimeFeedrateMode() {
        return this.modalState.feedrate === 'G93';
    }
    isUnitsPerMinuteFeedrateMode() {
        return this.modalState.feedrate === 'G94';
    }
    setPosition(x, y, z) {
        this.position.x = _.isNumber(x) ? x : this.position.x;
        this.position.y = _.isNumber(y) ? y : this.position.y;
        this.position.z = _.isNumber(z) ? z : this.position.z;
    }
    setModalState(modalState) {
        _.assign(this.modalState, modalState);
    }
    translateX(x, relative) {
        if (_.isUndefined(relative)) {
            relative = this.isRelativeDistance();
        }
        x = this.isImperialUnits() ? in2mm(x) : x;
        return translatePosition(this.position.x, x, !!relative);
    }
    translateY(y, relative) {
        if (_.isUndefined(relative)) {
            relative = this.isRelativeDistance();
        }
        y = this.isImperialUnits() ? in2mm(y) : y;
        return translatePosition(this.position.y, y, !!relative);
    }
    translateZ(z, relative) {
        if (_.isUndefined(relative)) {
            relative = this.isRelativeDistance();
        }
        z = this.isImperialUnits() ? in2mm(z) : z;
        return translatePosition(this.position.z, z, !!relative);
    }
    translateI(i) {
        return this.translateX(i, true);
    }
    translateJ(j) {
        return this.translateY(j, true);
    }
    translateK(k) {
        return this.translateZ(k, true);
    }
    translateR(r) {
        r = Number(r);
        if (_.isNaN(r)) {
            return 0;
        }
        return this.isImperialUnits() ? in2mm(r) : r;
    }
}

export default GCodeToolpath;
