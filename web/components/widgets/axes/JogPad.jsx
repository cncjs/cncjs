import _ from 'lodash';
import React from 'react';
import i18n from '../../../lib/i18n';
import serialport from '../../../lib/serialport';
import store from '../../../store';
import {
    ACTIVE_STATE_IDLE,
    IMPERIAL_UNIT,
    METRIC_UNIT
} from './constants';

// from mm to in
const mm2in = (val = 0) => val / 25.4;
// from in to mm
const in2mm = (val = 0) => val * 25.4;

class JogPad extends React.Component {
    static propTypes = {
        port: React.PropTypes.string,
        unit: React.PropTypes.string,
        activeState: React.PropTypes.string
    };

    jog(params) {
        serialport.writeln('G91'); // relative distance
        this.move(params);
        serialport.writeln('G90'); // absolute distance
    }
    move(params) {
        params = params || {};
        let s = _.map(params, (value, letter) => {
            return '' + letter + value;
        }).join(' ');

        serialport.writeln('G0 ' + s);
    }
    toUnitString(val) {
        let { unit } = this.props;

        val = Number(val) || 0;
        if (unit === METRIC_UNIT) {
            val = val.toFixed(3) * 1;
        }
        if (unit === IMPERIAL_UNIT) {
            val = mm2in(val).toFixed(4) * 1;
        }
        return '' + val;
    }
    getStepDistance() {
        let stepDistance = store.getState('widgets.axes.jog.stepDistance');
        stepDistance = this.toUnitString(stepDistance);
        return stepDistance;
    }
    render() {
        let { port, activeState, stepDistance } = this.props;
        let canClick = (!!port && (activeState === ACTIVE_STATE_IDLE));

        return (
            <div className="jog-pad">
                <table>
                    <tbody>
                        <tr>
                            <td>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-x-minus jog-y-plus"
                                    onClick={() => {
                                        let stepDistance = this.getStepDistance();
                                        this.jog({ X: -stepDistance, Y: stepDistance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move X- Y+')}
                                >
                                    <i className="glyphicon glyphicon-circle-arrow-up rotate--45deg"></i>
                                </button>
                            </td>
                            <td>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-y-plus"
                                    onClick={() => {
                                        let stepDistance = this.getStepDistance();
                                        this.jog({ Y: stepDistance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move Y+')}
                                >
                                    <span className="jog-direction">Y+</span>
                                </button>
                            </td>
                            <td>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-x-plus jog-y-plus"
                                    onClick={() => {
                                        let stepDistance = this.getStepDistance();
                                        this.jog({ X: stepDistance, Y: stepDistance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move X+ Y+')}
                                >
                                    <i className="glyphicon glyphicon-circle-arrow-up rotate-45deg"></i>
                                </button>
                            </td>
                            <td>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-z-plus"
                                    onClick={() => {
                                        let stepDistance = this.getStepDistance();
                                        this.jog({ Z: stepDistance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move Z+')}
                                >
                                    <span className="jog-direction">Z+</span>
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-x-minus"
                                    onClick={() => {
                                        let stepDistance = this.getStepDistance();
                                        this.jog({ X: -stepDistance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move X-')}
                                >
                                    <span className="jog-direction">X-</span>
                                </button>
                            </td>
                            <td>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-xy-zero"
                                    onClick={() => this.move({ X: 0, Y: 0 })}
                                    disabled={!canClick}
                                    title={i18n._('Move To XY Zero (G0 X0 Y0)')}
                                >
                                    <span className="jog-direction">X/Y</span>
                                </button>
                            </td>
                            <td>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-x-plus"
                                    onClick={() => {
                                        let stepDistance = this.getStepDistance();
                                        this.jog({ X: stepDistance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move X+')}
                                >
                                    <span className="jog-direction">X+</span>
                                </button>
                            </td>
                            <td>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-z-zero"
                                    onClick={() => this.move({ Z: 0 })}
                                    disabled={!canClick}
                                    title={i18n._('Move To Z Zero (G0 Z0)')}
                                >
                                    <span className="jog-direction">Z</span>
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-x-minus jog-y-minus"
                                    onClick={() => {
                                        let stepDistance = this.getStepDistance();
                                        this.jog({ X: -stepDistance, Y: -stepDistance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move X- Y-')}
                                >
                                    <i className="glyphicon glyphicon-circle-arrow-down rotate-45deg"></i>
                                </button>
                            </td>
                            <td>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-y-minus"
                                    onClick={() => {
                                        let stepDistance = this.getStepDistance();
                                        this.jog({ Y: -stepDistance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move Y-')}
                                >
                                    <span className="jog-direction">Y-</span>
                                </button>
                            </td>
                            <td>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-x-plus jog-y-minus"
                                    onClick={() => {
                                        let stepDistance = this.getStepDistance();
                                        this.jog({ X: stepDistance, Y: -stepDistance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move X+ Y-')}
                                >
                                    <i className="glyphicon glyphicon-circle-arrow-down rotate--45deg"></i>
                                </button>
                            </td>
                            <td>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-z-minus"
                                    onClick={() => {
                                        let stepDistance = this.getStepDistance();
                                        this.jog({ Z: -stepDistance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move Z-')}
                                >
                                    <span className="jog-direction">Z-</span>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }
}

export default JogPad;
