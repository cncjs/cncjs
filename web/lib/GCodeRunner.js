import _ from 'lodash';
import { GCodeInterpreter } from 'gcode-interpreter';

const in2mm = (v) => v * 25.4;
const mm2in = (v) => v / 25.4;

const noop = () => {};

const translatePosition = (position, newPosition, relative) => {
    relative = !!relative;
    newPosition = Number(newPosition);
    if (_.isNaN(newPosition)) {
        return position;
    }
    return relative ? (position + newPosition) : newPosition;
};

class GCodeRunner extends GCodeInterpreter {
    state = {
        x: 0,
        y: 0,
        z: 0,
        relative: false,
        units: 'G21' // G20: inch, G21: mm
    };

    // @param {object} [options]
    // @param {object} [options.state]
    // @param {function} [options.addLine]
    // @param {function} [options.addArcCurve]
    constructor(options) {
        super(options);

        this.options = _.extend({}, options);

        this.state = _.extend({}, this.state, options.state);
        this.options.addLine = this.options.addLine || noop;
        this.options.addArcCurve = this.options.addArcCurve || noop;

        if (this.state.units === 'G20') {
            this.setState({
                x: in2mm(this.state.x),
                y: in2mm(this.state.y),
                z: in2mm(this.state.z)
            });
        }
    }
    setState(newState) {
        this.state = _.assign({}, this.state, newState);
    }
    translateX(x, relative) {
        if (_.isUndefined(relative)) {
            relative = this.state.relative;
        }
        x = (this.state.units === 'G20') ? in2mm(x) : x;
        return translatePosition(this.state.x, x, !!relative);
    }
    translateY(y, relative) {
        if (_.isUndefined(relative)) {
            relative = this.state.relative;
        }
        y = (this.state.units === 'G20') ? in2mm(y) : y;
        return translatePosition(this.state.y, y, !!relative);
    }
    translateZ(z, relative) {
        if (_.isUndefined(relative)) {
            relative = this.state.relative;
        }
        z = (this.state.units === 'G20') ? in2mm(z) : z;
        return translatePosition(this.state.z, z, !!relative);
    }
    G0(params) {
        let v2 = {
            x: this.translateX(params.X),
            y: this.translateY(params.Y),
            z: this.translateZ(params.Z)
        };

        this.setState(v2);
    }

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
    G1(params) {
        let v1 = {
            x: this.state.x,
            y: this.state.y,
            z: this.state.z
        };
        let v2 = {
            x: this.translateX(params.X),
            y: this.translateY(params.Y),
            z: this.translateZ(params.Z)
        };

        this.options.addLine(v1, v2);
        this.setState(v2);
    }

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
    G2(params) {
        let isClockwise = true;
        let v1 = {
            x: this.state.x,
            y: this.state.y,
            z: this.state.z
        };
        let v2 = {
            x: this.translateX(params.X),
            y: this.translateY(params.Y),
            z: this.translateZ(params.Z)
        };
        let v0 = { // fixed point
            x: this.translateX(params.I, true),
            y: this.translateY(params.J, true),
            z: this.translateZ(params.K, true)
        };

        this.options.addArcCurve(v1, v2, v0, isClockwise);
        this.setState(v2);
    }

    G3(params) {
        let isClockwise = false;
        let v1 = {
            x: this.state.x,
            y: this.state.y,
            z: this.state.z
        };
        let v2 = {
            x: this.translateX(params.X),
            y: this.translateY(params.Y),
            z: this.translateZ(params.Z)
        };
        let v0 = { // fixed point
            x: this.translateX(params.I, true),
            y: this.translateY(params.J, true),
            z: this.translateZ(params.K, true)
        };

        this.options.addArcCurve(v1, v2, v0, isClockwise);
        this.setState(v2);
    }

    // G20: use inches for length units 
    G20() {
        this.setState({ units: 'G20' });
    }

    // G21: use millimeters for length units 
    G21() {
        this.setState({ units: 'G21' });
    }

    // G90: Set to Absolute Positioning
    // Example
    //   G90
    // All coordinates from now on are absolute relative to the origin of the machine.
    G90() {
        this.setState({ relative: false });
    }

    // G91: Set to Relative Positioning
    // Example
    //   G91
    // All coordinates from now on are relative to the last position.
    G91() {
        this.setState({ relative: true });
    }

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
    G92(params) {
        let v2 = {
            x: this.translateX(params.X),
            y: this.translateY(params.Y),
            z: this.translateZ(params.Z)
        };

        this.setState(v2);
    }
}

export default GCodeRunner;
