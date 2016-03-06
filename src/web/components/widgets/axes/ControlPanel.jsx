import React from 'react';
import JogPad from './JogPad';
import JogDistance from './JogDistance';
import MotionControls from './MotionControls';

const ControlPanel = (props) => {
    const { port, unit, activeState, machinePos, workingPos } = props;

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
                    <JogDistance
                        unit={unit}
                    />
                </div>
            </div>
        </div>
    );
};

ControlPanel.propTypes = {
    port: React.PropTypes.string,
    unit: React.PropTypes.string,
    activeState: React.PropTypes.string,
    machinePos: React.PropTypes.object,
    workingPos: React.PropTypes.object
};

export default ControlPanel;
