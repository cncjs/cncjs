import React from 'react';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import i18n from '../../../lib/i18n';
import controller from '../../../lib/controller';
import {
    ACTIVE_STATE_IDLE
} from './constants';

const MotionControls = ({ port, unit, activeState, machinePos, workingPos }) => {
    const handleSelect = (eventKey) => {
        const data = eventKey;
        if (data) {
            controller.writeln(data);
        }
    };

    const canClick = (!!port && (activeState === ACTIVE_STATE_IDLE));

    return (
        <div className="motion-controls">
            <div className="row no-gutters">
                <div className="col-xs-12">
                    <DropdownButton
                        bsSize="sm"
                        bsStyle="default"
                        title={
                            <span><i className="fa fa-h-square"></i>&nbsp;{i18n._('Predefined Position')}</span>
                        }
                        id="predefined-position-dropdown"
                        pullRight
                        disabled={!canClick}
                    >
                        <MenuItem eventKey="G28" onSelect={handleSelect} disabled={!canClick}>
                            {i18n._('Go To Predefined Position 1 (G28)')}
                        </MenuItem>
                        <MenuItem eventKey="G30" onSelect={handleSelect} disabled={!canClick}>
                            {i18n._('Go To Predefined Position 2 (G30)')}
                        </MenuItem>
                        <MenuItem divider />
                        <MenuItem eventKey="G28.1" onSelect={handleSelect} disabled={!canClick}>
                            {i18n._('Set Predefined Position 1 (G28.1)')}
                        </MenuItem>
                        <MenuItem eventKey="G30.1" onSelect={handleSelect} disabled={!canClick}>
                            {i18n._('Set Predefined Position 2 (G30.1)')}
                        </MenuItem>
                    </DropdownButton>
                </div>
            </div>
            <div className="row no-gutters">
                <div className="col-xs-12">
                    <button
                        type="button"
                        className="btn btn-sm btn-default"
                        onClick={() => controller.writeln('G0 X0 Y0 Z0')}
                        disabled={!canClick}
                    >
                        {i18n._('Go To Work Zero')}
                    </button>
                </div>
            </div>
            <div className="row no-gutters">
                <div className="col-xs-12">
                    <button
                        type="button"
                        className="btn btn-sm btn-default"
                        onClick={() => controller.writeln('G53 G0 X0 Y0 Z0')}
                        disabled={!canClick}
                    >
                        {i18n._('Go To Machine Zero')}
                    </button>
                </div>
            </div>
        </div>
    );
};

MotionControls.propTypes = {
    port: React.PropTypes.string,
    unit: React.PropTypes.string,
    activeState: React.PropTypes.string,
    machinePos: React.PropTypes.object,
    workingPos: React.PropTypes.object
};

export default MotionControls;
