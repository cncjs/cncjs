import _ from 'lodash';
import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import CSSModules from 'react-css-modules';
import i18n from '../../lib/i18n';
import combokeys from '../../lib/combokeys';
import controller from '../../lib/controller';
import { preventDefault } from '../../lib/dom-events';
import { mm2in } from '../../lib/units';
import store from '../../store';
import ShuttleControl from './ShuttleControl';
import {
    IMPERIAL_UNITS,
    METRIC_UNITS
} from '../../constants';
import styles from './index.styl';

const toUnits = (units, val) => {
    val = Number(val) || 0;
    if (units === IMPERIAL_UNITS) {
        val = mm2in(val).toFixed(4) * 1;
    }
    if (units === METRIC_UNITS) {
        val = val.toFixed(3) * 1;
    }

    return val;
};

@CSSModules(styles, { allowMultiple: true })
class JogPad extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };
    actionHandlers = {
        SELECT_AXIS: (event, { axis }) => {
            const { state, actions } = this.props;
            const { canClick, selectedAxis } = state;

            if (!canClick) {
                return;
            }

            if (selectedAxis === axis) {
                actions.selectAxis(); // deselect axis
            } else {
                actions.selectAxis(axis);
            }
        },
        JOG: (event, { axis = null, direction = 1, factor = 1 }) => {
            const { state } = this.props;
            const { canClick, keypadJogging, selectedAxis } = state;

            if (!canClick) {
                return;
            }

            if (axis !== null && !keypadJogging) {
                // keypad jogging is disabled
                return;
            }

            // The keyboard events of arrow keys for X-axis/Y-axis and pageup/pagedown for Z-axis
            // are not prevented by default. If a jog command will be executed, it needs to
            // stop the default behavior of a keyboard combination in a browser.
            preventDefault(event);

            axis = axis || selectedAxis;
            const distance = this.getJogDistance();
            const jog = {
                x: () => this.jog({ X: direction * distance * factor }),
                y: () => this.jog({ Y: direction * distance * factor }),
                z: () => this.jog({ Z: direction * distance * factor })
            }[axis];

            jog && jog();
        },
        SHUTTLE: (event, { value = 0 }) => {
            const { state } = this.props;
            const { canClick, selectedAxis } = state;

            if (!canClick) {
                return;
            }

            if (value === 0) {
                // Clear accumulated result
                this.shuttleControl.clear();

                if (selectedAxis) {
                    controller.command('gcode', 'G90');
                }
                return;
            }

            if (!selectedAxis) {
                return;
            }

            const distance = Math.min(this.getJogDistance(), 1);

            this.shuttleControl.accumulate(selectedAxis, value, distance);
        }
    };
    shuttleControl = null;

    componentDidMount() {
        _.each(this.actionHandlers, (callback, eventName) => {
            combokeys.on(eventName, callback);
        });

        // Shuttle Zone
        this.shuttleControl = new ShuttleControl();
        this.shuttleControl.on('flush', ({ axis, feedrate, relativeDistance }) => {
            feedrate = feedrate.toFixed(3) * 1;
            relativeDistance = relativeDistance.toFixed(4) * 1;

            controller.command('gcode', 'G91 G1 F' + feedrate + ' ' + axis + relativeDistance);
            controller.command('gcode', 'G90');
        });
    }
    componentWillUnmount() {
        _.each(this.actionHandlers, (callback, eventName) => {
            combokeys.removeListener(eventName, callback);
        });

        this.shuttleControl.removeAllListeners('flush');
        this.shuttleControl = null;
    }
    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    jog(params = {}) {
        const s = _.map(params, (value, letter) => ('' + letter.toUpperCase() + value)).join(' ');
        controller.command('gcode', 'G91 G0 ' + s); // relative distance
        controller.command('gcode', 'G90'); // absolute distance
    }
    move(params = {}) {
        const s = _.map(params, (value, letter) => ('' + letter.toUpperCase() + value)).join(' ');
        controller.command('gcode', 'G0 ' + s);
    }
    getJogDistance() {
        const { state } = this.props;
        const { units } = state;
        const selectedDistance = store.get('widgets.axes.jog.selectedDistance');
        const customDistance = store.get('widgets.axes.jog.customDistance');
        if (selectedDistance) {
            return Number(selectedDistance) || 0;
        }
        return toUnits(units, customDistance);
    }
    render() {
        const { state } = this.props;
        const { canClick, keypadJogging, selectedAxis } = state;

        return (
            <div styleName="jog-pad">
                <div styleName="row-space">
                    <div className="row no-gutters">
                        <div className="col-xs-3">
                            <div styleName="col-space">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-x-minus jog-y-plus"
                                    onClick={() => {
                                        const distance = this.getJogDistance();
                                        this.jog({ X: -distance, Y: distance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move X- Y+')}
                                >
                                    <i className="fa fa-arrow-circle-up" styleName="rotate--45deg" style={{ fontSize: 16 }} />
                                </button>
                            </div>
                        </div>
                        <div
                            className="col-xs-3"
                            styleName={classNames(
                                { 'jog-direction-highlight': keypadJogging || selectedAxis === 'y' }
                            )}
                        >
                            <div styleName="col-space">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-y-plus"
                                    onClick={() => {
                                        const distance = this.getJogDistance();
                                        this.jog({ Y: distance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move Y+')}
                                >
                                    <span styleName="jog-text">Y+</span>
                                </button>
                            </div>
                        </div>
                        <div className="col-xs-3">
                            <div styleName="col-space">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-x-plus jog-y-plus"
                                    onClick={() => {
                                        const distance = this.getJogDistance();
                                        this.jog({ X: distance, Y: distance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move X+ Y+')}
                                >
                                    <i className="fa fa-arrow-circle-up" styleName="rotate-45deg" style={{ fontSize: 16 }} />
                                </button>
                            </div>
                        </div>
                        <div
                            className="col-xs-3"
                            styleName={classNames(
                                { 'jog-direction-highlight': keypadJogging || selectedAxis === 'z' }
                            )}
                        >
                            <div styleName="col-space">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-z-plus"
                                    onClick={() => {
                                        const distance = this.getJogDistance();
                                        this.jog({ Z: distance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move Z+')}
                                >
                                    <span styleName="jog-text">Z+</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div styleName="row-space">
                    <div className="row no-gutters">
                        <div
                            className="col-xs-3"
                            styleName={classNames(
                                { 'jog-direction-highlight': keypadJogging || selectedAxis === 'x' }
                            )}
                        >
                            <div styleName="col-space">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-x-minus"
                                    onClick={() => {
                                        const distance = this.getJogDistance();
                                        this.jog({ X: -distance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move X-')}
                                >
                                    <span styleName="jog-text">X-</span>
                                </button>
                            </div>
                        </div>
                        <div className="col-xs-3">
                            <div styleName="col-space">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-xy-zero"
                                    onClick={() => this.move({ X: 0, Y: 0 })}
                                    disabled={!canClick}
                                    title={i18n._('Move To XY Zero (G0 X0 Y0)')}
                                >
                                    <span styleName="jog-text">X/Y</span>
                                </button>
                            </div>
                        </div>
                        <div
                            className="col-xs-3"
                            styleName={classNames(
                                { 'jog-direction-highlight': keypadJogging || selectedAxis === 'x' }
                            )}
                        >
                            <div styleName="col-space">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-x-plus"
                                    onClick={() => {
                                        const distance = this.getJogDistance();
                                        this.jog({ X: distance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move X+')}
                                >
                                    <span styleName="jog-text">X+</span>
                                </button>
                            </div>
                        </div>
                        <div className="col-xs-3">
                            <div styleName="col-space">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-z-zero"
                                    onClick={() => this.move({ Z: 0 })}
                                    disabled={!canClick}
                                    title={i18n._('Move To Z Zero (G0 Z0)')}
                                >
                                    <span styleName="jog-text">Z</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div styleName="row-space">
                    <div className="row no-gutters">
                        <div className="col-xs-3">
                            <div styleName="col-space">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-x-minus jog-y-minus"
                                    onClick={() => {
                                        const distance = this.getJogDistance();
                                        this.jog({ X: -distance, Y: -distance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move X- Y-')}
                                >
                                    <i className="fa fa-arrow-circle-down" styleName="rotate-45deg" style={{ fontSize: 16 }} />
                                </button>
                            </div>
                        </div>
                        <div
                            className="col-xs-3"
                            styleName={classNames(
                                { 'jog-direction-highlight': keypadJogging || selectedAxis === 'y' }
                            )}
                        >
                            <div styleName="col-space">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-y-minus"
                                    onClick={() => {
                                        const distance = this.getJogDistance();
                                        this.jog({ Y: -distance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move Y-')}
                                >
                                    <span styleName="jog-text">Y-</span>
                                </button>
                            </div>
                        </div>
                        <div className="col-xs-3">
                            <div styleName="col-space">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-x-plus jog-y-minus"
                                    onClick={() => {
                                        const distance = this.getJogDistance();
                                        this.jog({ X: distance, Y: -distance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move X+ Y-')}
                                >
                                    <i className="fa fa-arrow-circle-down" styleName="rotate--45deg" style={{ fontSize: 16 }} />
                                </button>
                            </div>
                        </div>
                        <div
                            className="col-xs-3"
                            styleName={classNames(
                                { 'jog-direction-highlight': keypadJogging || selectedAxis === 'z' }
                            )}
                        >
                            <div styleName="col-space">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-z-minus"
                                    onClick={() => {
                                        const distance = this.getJogDistance();
                                        this.jog({ Z: -distance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move Z-')}
                                >
                                    <span styleName="jog-text">Z-</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default JogPad;
