import _ from 'lodash';
import i18n from 'i18next';
import React from 'react';
import serialport from '../../../lib/serialport';
import {
    ACTIVE_STATE_IDLE
} from './constants';

class JogJoystickControl extends React.Component {
    static propTypes = {
        port: React.PropTypes.string,
        unit: React.PropTypes.string,
        activeState: React.PropTypes.string,
        distance: React.PropTypes.number
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
    render() {
        let { port, activeState, distance } = this.props;
        let canClick = (!!port && (activeState === ACTIVE_STATE_IDLE));

        return (
            <div className="jog-joystick-control">
                <table>
                    <tbody>
                        <tr>
                            <td>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-x-minus jog-y-plus"
                                    onClick={() => this.jog({ X: -distance, Y: distance })}
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
                                    onClick={() => this.jog({ Y: distance })}
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
                                    onClick={() => this.jog({ X: distance, Y: distance })}
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
                                    onClick={() => this.jog({ Z: distance })}
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
                                    onClick={() => this.jog({ X: -distance })}
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
                                    onClick={() => this.jog({ X: distance })}
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
                                    onClick={() => this.jog({ X: -distance, Y: -distance })}
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
                                    onClick={() => this.jog({ Y: -distance })}
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
                                    onClick={() => this.jog({ X: distance, Y: -distance })}
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
                                    onClick={() => this.jog({ Z: -distance })}
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

export default JogJoystickControl;
