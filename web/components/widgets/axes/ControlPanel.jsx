import i18n from 'i18next';
import React from 'react';
import serialport from '../../../lib/serialport';
import JogDistanceControl from './JogDistanceControl';
import JogJoystickControl from './JogJoystickControl';
import MotionControls from './MotionControls';
import {
    ACTIVE_STATE_IDLE,
    DISTANCE_DEFAULT
} from './constants';

class ControlPanel extends React.Component {
    state = {
        distance: DISTANCE_DEFAULT
    };
    static propTypes = {
        port: React.PropTypes.string,
        unit: React.PropTypes.string,
        activeState: React.PropTypes.string,
        machinePos: React.PropTypes.object,
        workingPos: React.PropTypes.object
    };

    changeDistance(distance) {
        this.setState({ distance: Number(distance) || DISTANCE_DEFAULT });
    }
    render() {
        let { port, unit, activeState, machinePos, workingPos } = this.props;
        let { distance } = this.state;
        let canClick = (!!port && (activeState === ACTIVE_STATE_IDLE));
        let styles = {
            jogControls: {
            },
            motionControls: {
            }
        };

        return (
            <div className="container-fluid control-panel">
                <div className="row no-gutter">
                    <div className="col-sm-6">
                        <JogJoystickControl
                            port={port}
                            unit={unit}
                            activeState={activeState}
                            distance={distance}
                        />
                    </div>
                    <div className="col-sm-6">
                        <MotionControls
                            port={port}
                            unit={unit}
                            activeState={activeState}
                            machinePos={machinePos}
                            workingPos={workingPos}
                        />
                    </div>
                </div>
                <div className="row no-gutter">
                    <div className="col-sm-12">
                        <JogDistanceControl
                            unit={unit}
                            onChange={::this.changeDistance}
                        />
                    </div>
                </div>
            </div>
        );
    }
}

export default ControlPanel;
