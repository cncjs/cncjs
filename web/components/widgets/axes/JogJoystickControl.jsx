import React from 'react';
import serialport from '../../../lib/serialport';
import {
    ACTIVE_STATE_RUN
} from './constants';

class JogJoystickControl extends React.Component {
    static propTypes = {
        port: React.PropTypes.string,
        unit: React.PropTypes.string,
        activeState: React.PropTypes.string,
        feedrate: React.PropTypes.number,
        distance: React.PropTypes.number
    };

    jogForwardX() {
        let { feedrate, distance } = this.props;
        serialport.writeln('G91');
        serialport.writeln('G1 F' + feedrate + ' X' + distance);
        serialport.writeln('G90');
    }
    jogBackwardX() {
        let { feedrate, distance } = this.props;
        serialport.writeln('G91');
        serialport.writeln('G1 F' + feedrate + ' X-' + distance);
        serialport.writeln('G90');
    }
    jogForwardY() {
        let { feedrate, distance } = this.props;
        serialport.writeln('G91');
        serialport.writeln('G1 F' + feedrate + ' Y' + distance);
        serialport.writeln('G90');
    }
    jogBackwardY() {
        let { feedrate, distance } = this.props;
        serialport.writeln('G91');
        serialport.writeln('G1 F' + feedrate + ' Y-' + distance);
        serialport.writeln('G90');
    }
    jogForwardZ() {
        let { feedrate, distance } = this.props;
        serialport.writeln('G91');
        serialport.writeln('G1 F' + feedrate + ' Z' + distance);
        serialport.writeln('G90');
    }
    jogBackwardZ() {
        let { feedrate, distance } = this.props;
        serialport.writeln('G91');
        serialport.writeln('G1 F' + feedrate + ' Z-' + distance);
        serialport.writeln('G90');
    }
    render() {
        let { port, activeState } = this.props;
        let canClick = (!!port && (activeState !== ACTIVE_STATE_RUN));

        return (
            <div>
                <table className="table-centered">
                    <tbody>
                        <tr>
                            <td className="jog-x">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-x-minus"
                                    onClick={::this.jogBackwardX}
                                    disabled={!canClick}
                                >
                                    X-
                                </button>
                            </td>
                            <td className="jog-y">
                                <div className="btn-group-vertical">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-default jog-y-plus"
                                        onClick={::this.jogForwardY}
                                        disabled={!canClick}
                                    >
                                        Y+
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-default jog-y-minus"
                                        onClick={::this.jogBackwardY}
                                        disabled={!canClick}
                                    >
                                        Y-
                                    </button>
                                </div>
                            </td>
                            <td className="jog-x">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-x-plus"
                                    onClick={::this.jogForwardX}
                                    disabled={!canClick}
                                >
                                    X+
                                </button>
                            </td>
                            <td className="jog-z">
                                <div className="btn-group-vertical">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-default jog-z-plus"
                                        onClick={::this.jogForwardZ}
                                        disabled={!canClick}
                                    >
                                        Z+
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-default jog-z-minus"
                                        onClick={::this.jogBackwardZ}
                                        disabled={!canClick}
                                    >
                                        Z-
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }
}

export default JogJoystickControl;
