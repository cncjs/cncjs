import React from 'react';
import i18n from '../../../lib/i18n';
import JogPad from './JogPad';
import JogStepDistance from './JogStepDistance';
import MotionControls from './MotionControls';
import {
    ACTIVE_STATE_IDLE,
    STEP_DISTANCE_DEFAULT
} from './constants';

class ControlPanel extends React.Component {
    static propTypes = {
        port: React.PropTypes.string,
        unit: React.PropTypes.string,
        activeState: React.PropTypes.string,
        machinePos: React.PropTypes.object,
        workingPos: React.PropTypes.object
    };

    render() {
        let { port, unit, activeState, machinePos, workingPos } = this.props;
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
                        <JogPad
                            port={port}
                            unit={unit}
                            activeState={activeState}
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
                        <JogStepDistance
                            unit={unit}
                        />
                    </div>
                </div>
            </div>
        );
    }
}

export default ControlPanel;
