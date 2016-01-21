import _ from 'lodash';
import React from 'react';
import i18n from '../../../lib/i18n';
import combokeys from '../../../lib/combokeys';
import controller from '../../../lib/controller';
import { mm2in } from '../../../lib/units'; 
import store from '../../../store';
import {
    ACTIVE_STATE_IDLE,
    IMPERIAL_UNIT,
    METRIC_UNIT
} from './constants';

class JogPad extends React.Component {
    static propTypes = {
        port: React.PropTypes.string,
        unit: React.PropTypes.string,
        activeState: React.PropTypes.string
    };
    actionHandlers = {
        'Z+': () => {
            const stepDistance = this.getStepDistance();
            this.jog({ Z: stepDistance });
        },
        'Z0': () => {
            this.move({ Z: 0 });
        },
        'Z-': () => {
            const stepDistance = this.getStepDistance();
            this.jog({ Z: -stepDistance });
        },
        'X-Y+': () => {
            const stepDistance = this.getStepDistance();
            this.jog({ X: -stepDistance, Y: stepDistance });
        },
        'Y+': () => {
            const stepDistance = this.getStepDistance();
            this.jog({ Y: stepDistance });
        },
        'X+Y+': () => {
            const stepDistance = this.getStepDistance();
            this.jog({ X: stepDistance, Y: stepDistance });
        },
        'X-': () => {
            const stepDistance = this.getStepDistance();
            this.jog({ X: -stepDistance });
        },
        'X0Y0': () => {
            this.move({ X: 0, Y: 0 });
        },
        'X+': () => {
            const stepDistance = this.getStepDistance();
            this.jog({ X: stepDistance });
        },
        'X-Y-': () => {
            const stepDistance = this.getStepDistance();
            this.jog({ X: -stepDistance, Y: -stepDistance });
        },
        'Y-': () => {
            const stepDistance = this.getStepDistance();
            this.jog({ Y: -stepDistance });
        },
        'X+Y-': () => {
            const stepDistance = this.getStepDistance();
            this.jog({ X: stepDistance, Y: -stepDistance });
        }
    };

    componentDidMount() {
        _.each(this.actionHandlers, (callback, eventName) => {
            combokeys.on(eventName, callback);
        });
    }
    componentWillUnmount() {
        _.each(this.actionHandlers, (callback, eventName) => {
            combokeys.off(eventName, callback);
        });
    }
    invoke(action) {
        return _.result(this.actionHandlers, action);
    }
    jog(params) {
        controller.writeln('G91'); // relative distance
        this.move(params);
        controller.writeln('G90'); // absolute distance
    }
    move(params) {
        params = params || {};
        let s = _.map(params, (value, letter) => {
            return '' + letter + value;
        }).join(' ');

        controller.writeln('G0 ' + s);
    }
    getStepDistance() {
        let { unit } = this.props;
        let stepDistance = store.getState('widgets.axes.jog.stepDistance');
        stepDistance = this.toUnitValue(unit, stepDistance);
        return stepDistance;
    }
    toUnitValue(unit, val) {
        val = Number(val) || 0;
        if (unit === IMPERIAL_UNIT) {
            val = mm2in(val).toFixed(4) * 1;
        }
        if (unit === METRIC_UNIT) {
            val = val.toFixed(3) * 1;
        }

        return val;
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
                                    onClick={() => this.invoke('X-Y+')}
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
                                    onClick={() => this.invoke('Y+')}
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
                                    onClick={() => this.invoke('X+Y+')}
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
                                    onClick={() => this.invoke('Z+')}
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
                                    onClick={() => this.invoke('X-')}
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
                                    onClick={() => this.invoke('X0Y0')}
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
                                    onClick={() => this.invoke('X+')}
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
                                    onClick={() => this.invoke('Z0')}
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
                                    onClick={() => this.invoke('X-Y-')}
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
                                    onClick={() => this.invoke('Y-')}
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
                                    onClick={() => this.invoke('X+Y-')}
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
                                    onClick={() => this.invoke('Z-')}
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
