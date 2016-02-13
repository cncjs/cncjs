import _ from 'lodash';
import classNames from 'classnames';
import pubsub from 'pubsub-js';
import React from 'react';
import i18n from '../../../lib/i18n';
import combokeys from '../../../lib/combokeys';
import controller from '../../../lib/controller';
import { mm2in } from '../../../lib/units'; 
import store from '../../../store';
import ShuttleZone from './ShuttleZone';
import {
    ACTIVE_STATE_IDLE,
    ACTIVE_STATE_RUN,
    IMPERIAL_UNIT,
    METRIC_UNIT
} from './constants';

class JogPad extends React.Component {
    static propTypes = {
        port: React.PropTypes.string,
        unit: React.PropTypes.string,
        activeState: React.PropTypes.string
    };
    state = {
        selectedAxis: '' // Defaults to empty
    };
    actionHandlers = {
        'X_AXIS': () => {
            const { port, activeState } = this.props;
            const canSelect = (!!port && activeState === ACTIVE_STATE_IDLE);

            if (canSelect) {
                if (this.state.selectedAxis === 'x') {
                    this.setState({ selectedAxis: '' });
                } else {
                    this.setState({ selectedAxis: 'x' });
                }
            }
        },
        'Y_AXIS': () => {
            const { port, activeState } = this.props;
            const canSelect = (!!port && activeState === ACTIVE_STATE_IDLE);

            if (canSelect) {
                if (this.state.selectedAxis === 'y') {
                    this.setState({ selectedAxis: '' });
                } else {
                    this.setState({ selectedAxis: 'y' });
                }
            }
        },
        'Z_AXIS': () => {
            const { port, activeState } = this.props;
            const canSelect = (!!port && activeState === ACTIVE_STATE_IDLE);

            if (canSelect) {
                if (this.state.selectedAxis === 'z') {
                    this.setState({ selectedAxis: '' });
                } else {
                    this.setState({ selectedAxis: 'z' });
                }
            }
        },
        'JOG_FORWARD': () => {
            const { port, activeState } = this.props;
            const canJog = (!!port && _.includes([ACTIVE_STATE_IDLE, ACTIVE_STATE_RUN], activeState));

            if (canJog) {
                let distance = this.getJogDistance();
                let jog = {
                    'x': () => this.jog({ X: distance }),
                    'y': () => this.jog({ Y: distance }),
                    'z': () => this.jog({ Z: distance })
                }[this.state.selectedAxis];

                jog && jog();
            }
        },
        'JOG_BACKWARD': () => {
            const { port, activeState } = this.props;
            const canJog = (!!port && _.includes([ACTIVE_STATE_IDLE, ACTIVE_STATE_RUN], activeState));

            if (canJog) {
                let distance = this.getJogDistance();
                let jog = {
                    'x': () => this.jog({ X: -distance }),
                    'y': () => this.jog({ Y: -distance }),
                    'z': () => this.jog({ Z: -distance })
                }[this.state.selectedAxis];

                jog && jog();
            }
        },
        'SHUTTLE_ZONE': (value = 0) => {
            const { selectedAxis } = this.state;

            if (value === 0) {
                // Clear accumulated result
                this.shuttleZone.clear();

                if (selectedAxis) {
                    controller.writeln('G90');
                }
                return;
            }

            if (!selectedAxis) {
                return;
            }

            const distance = Math.min(this.getJogDistance(), 1);

            this.shuttleZone.accumulate(selectedAxis, value, distance);
        }
    };
    pubsubTokens = [];
    shuttleZone = null;

    componentDidMount() {
        this.subscribe();

        _.each(this.actionHandlers, (callback, eventName) => {
            combokeys.on(eventName, callback);
        });

        // Shuttle Zone
        this.shuttleZone = new ShuttleZone();
        this.shuttleZone.on('flush', (accumulatedResult) => {
            let { axis, feedrate, relativeDistance } = accumulatedResult;

            feedrate = feedrate.toFixed(3) * 1;
            relativeDistance = relativeDistance.toFixed(4) * 1;

            controller.writeln('G91 G1 F' + feedrate + ' ' + axis + relativeDistance);
            controller.writeln('G90');
        });
    }
    componentWillUnmount() {
        this.unsubscribe();

        _.each(this.actionHandlers, (callback, eventName) => {
            combokeys.removeListener(eventName, callback);
        });

        this.shuttleZone.removeAllListeners('flush');
        this.shuttleZone = null;
    }
    subscribe() {
        { // gcode:start
            let token = pubsub.subscribe('gcode:start', (msg) => {
                // unset the selected axis to prevent from accidental movement while running a G-code file
                this.setState({ selectedAxis: '' });
            });
            this.pubsubTokens.push(token);
        }
        { // gcode:resume
            let token = pubsub.subscribe('gcode:resume', (msg) => {
                // unset the selected axis to prevent from accidental movement while running a G-code file
                this.setState({ selectedAxis: '' });
            });
            this.pubsubTokens.push(token);
        }
    }
    unsubscribe() {
        _.each(this.pubsubTokens, (token) => {
            pubsub.unsubscribe(token);
        });
        this.pubsubTokens = [];
    }
    jog(params = {}) {
        let s = _.map(params, (value, letter) => {
            return '' + letter + value;
        }).join(' ');
        controller.writeln('G91 G0 ' + s); // relative distance
        controller.writeln('G90'); // absolute distance
    }
    move(params = {}) {
        let s = _.map(params, (value, letter) => {
            return '' + letter + value;
        }).join(' ');
        controller.writeln('G0 ' + s);
    }
    getJogDistance() {
        let { unit } = this.props;
        let selectedDistance = store.get('widgets.axes.jog.selectedDistance');
        let customDistance = store.get('widgets.axes.jog.customDistance');
        if (selectedDistance) {
            return Number(selectedDistance) || 0;
        }
        return this.toUnitValue(unit, customDistance);
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
        let { selectedAxis } = this.state;
        let { port, activeState, distance } = this.props;
        let canClick = (!!port && (activeState === ACTIVE_STATE_IDLE));
        let classes = {
            'jog-direction-x': classNames(
                'jog-direction',
                { 'jog-direction-highlight': selectedAxis === 'x' }
            ),
            'jog-direction-y': classNames(
                'jog-direction',
                { 'jog-direction-highlight': selectedAxis === 'y' }
            ),
            'jog-direction-z': classNames(
                'jog-direction',
                { 'jog-direction-highlight': selectedAxis === 'z' }
            )
        };

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
                                        const distance = this.getJogDistance();
                                        this.jog({X: -distance, Y: distance});
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move X- Y+')}
                                >
                                    <i className="fa fa-arrow-circle-up rotate--45deg"></i>
                                </button>
                            </td>
                            <td>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-y-plus"
                                    onClick={() => {
                                        const distance = this.getJogDistance();
                                        this.jog({Y: distance});
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move Y+')}
                                >
                                    <span className={classes['jog-direction-y']}>Y+</span>
                                </button>
                            </td>
                            <td>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-x-plus jog-y-plus"
                                    onClick={() => {
                                        const distance = this.getJogDistance();
                                        this.jog({X: distance, Y: distance});
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move X+ Y+')}
                                >
                                    <i className="fa fa-arrow-circle-up rotate-45deg"></i>
                                </button>
                            </td>
                            <td>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-z-plus"
                                    onClick={() => {
                                        const distance = this.getJogDistance();
                                        this.jog({Z: distance});
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move Z+')}
                                >
                                    <span className={classes['jog-direction-z']}>Z+</span>
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-x-minus"
                                    onClick={() => {
                                        const distance = this.getJogDistance();
                                        this.jog({X: -distance});
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move X-')}
                                >
                                    <span className={classes['jog-direction-x']}>X-</span>
                                </button>
                            </td>
                            <td>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-xy-zero"
                                    onClick={() => this.move({X: 0, Y: 0})}
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
                                        const distance = this.getJogDistance();
                                        this.jog({X: distance});
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move X+')}
                                >
                                    <span className={classes['jog-direction-x']}>X+</span>
                                </button>
                            </td>
                            <td>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-z-zero"
                                    onClick={() => this.move({Z: 0})}
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
                                        const distance = this.getJogDistance();
                                        this.jog({X: -distance, Y: -distance});
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move X- Y-')}
                                >
                                    <i className="fa fa-arrow-circle-down rotate-45deg"></i>
                                </button>
                            </td>
                            <td>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-y-minus"
                                    onClick={() => {
                                        const distance = this.getJogDistance();
                                        this.jog({Y: -distance});
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move Y-')}
                                >
                                    <span className={classes['jog-direction-y']}>Y-</span>
                                </button>
                            </td>
                            <td>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-x-plus jog-y-minus"
                                    onClick={() => {
                                        const distance = this.getJogDistance();
                                        this.jog({X: distance, Y: -distance});
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move X+ Y-')}
                                >
                                    <i className="fa fa-arrow-circle-down rotate--45deg"></i>
                                </button>
                            </td>
                            <td>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-z-minus"
                                    onClick={() => {
                                        const distance = this.getJogDistance();
                                        this.jog({Z: -distance});
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move Z-')}
                                >
                                    <span className={classes['jog-direction-z']}>Z-</span>
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
