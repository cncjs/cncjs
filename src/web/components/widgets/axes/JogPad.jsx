import _ from 'lodash';
import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import i18n from '../../../lib/i18n';
import combokeys from '../../../lib/combokeys';
import controller from '../../../lib/controller';
import { preventDefault } from '../../../lib/dom-events';
import { mm2in } from '../../../lib/units';
import store from '../../../store';
import ShuttleControl from './ShuttleControl';
import {
    IMPERIAL_UNITS,
    METRIC_UNITS
} from '../../../constants';

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
                    controller.writeln('G90');
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

            controller.writeln('G91 G1 F' + feedrate + ' ' + axis + relativeDistance);
            controller.writeln('G90');
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
        return !_.isEqual(nextProps, this.props);
    }
    jog(params = {}) {
        const s = _.map(params, (value, letter) => ('' + letter.toUpperCase() + value)).join(' ');
        controller.writeln('G91 G0 ' + s); // relative distance
        controller.writeln('G90'); // absolute distance
    }
    move(params = {}) {
        const s = _.map(params, (value, letter) => ('' + letter.toUpperCase() + value)).join(' ');
        controller.writeln('G0 ' + s);
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
        const classes = {
            'jog-direction-x': classNames(
                'jog-direction',
                { 'jog-direction-highlight': keypadJogging || selectedAxis === 'x' }
            ),
            'jog-direction-y': classNames(
                'jog-direction',
                { 'jog-direction-highlight': keypadJogging || selectedAxis === 'y' }
            ),
            'jog-direction-z': classNames(
                'jog-direction',
                { 'jog-direction-highlight': keypadJogging || selectedAxis === 'z' }
            )
        };

        return (
            <div className="jog-pad">
                <div className="row no-gutters">
                    <div className="col-xs-3">
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
                            <i className="fa fa-arrow-circle-up rotate--45deg"></i>
                        </button>
                    </div>
                    <div className={classNames('col-xs-3', classes['jog-direction-y'])}>
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
                            <span className="jog-text">Y+</span>
                        </button>
                    </div>
                    <div className="col-xs-3">
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
                            <i className="fa fa-arrow-circle-up rotate-45deg"></i>
                        </button>
                    </div>
                    <div className={classNames('col-xs-3', classes['jog-direction-z'])}>
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
                            <span className="jog-text">Z+</span>
                        </button>
                    </div>
                </div>
                <div className="row no-gutters">
                    <div className={classNames('col-xs-3', classes['jog-direction-x'])}>
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
                            <span className="jog-text">X-</span>
                        </button>
                    </div>
                    <div className="col-xs-3">
                        <button
                            type="button"
                            className="btn btn-sm btn-default jog-xy-zero"
                            onClick={() => this.move({ X: 0, Y: 0 })}
                            disabled={!canClick}
                            title={i18n._('Move To XY Zero (G0 X0 Y0)')}
                        >
                            <span className="jog-text">X/Y</span>
                        </button>
                    </div>
                    <div className={classNames('col-xs-3', classes['jog-direction-x'])}>
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
                            <span className="jog-text">X+</span>
                        </button>
                    </div>
                    <div className="col-xs-3">
                        <button
                            type="button"
                            className="btn btn-sm btn-default jog-z-zero"
                            onClick={() => this.move({ Z: 0 })}
                            disabled={!canClick}
                            title={i18n._('Move To Z Zero (G0 Z0)')}
                        >
                            <span className="jog-text">Z</span>
                        </button>
                    </div>
                </div>
                <div className="row no-gutters">
                    <div className="col-xs-3">
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
                            <i className="fa fa-arrow-circle-down rotate-45deg"></i>
                        </button>
                    </div>
                    <div className={classNames('col-xs-3', classes['jog-direction-y'])}>
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
                            <span className="jog-text">Y-</span>
                        </button>
                    </div>
                    <div className="col-xs-3">
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
                            <i className="fa fa-arrow-circle-down rotate--45deg"></i>
                        </button>
                    </div>
                    <div className={classNames('col-xs-3', classes['jog-direction-z'])}>
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
                            <span className="jog-text">Z-</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

export default JogPad;
