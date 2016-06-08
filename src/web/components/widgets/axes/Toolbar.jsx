import React from 'react';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import i18n from '../../../lib/i18n';
import controller from '../../../lib/controller';
import {
    ACTIVE_STATE_IDLE,
    METRIC_UNIT
} from './constants';

const ToolbarButton = ({ port, unit, activeState }) => {
    const toggleDisplayUnit = () => {
        if (unit === METRIC_UNIT) {
            controller.writeln('G20'); // G20 specifies Imperial unit
        } else {
            controller.writeln('G21'); // G21 specifies Metric unit
        }
    };
    const handleSelect = (eventKey) => {
        const data = eventKey;
        if (data) {
            controller.writeln(data);
        }
    };

    const canClick = (!!port && (activeState === ACTIVE_STATE_IDLE));

    return (
        <div>
            <div className="toolbar-button btn-group">
                <button
                    type="button"
                    className="btn btn-xs btn-default"
                    onClick={toggleDisplayUnit}
                    disabled={!canClick}
                >
                    {i18n._('in / mm')}
                </button>
                <DropdownButton
                    bsSize="xs"
                    bsStyle="default"
                    title="XYZ"
                    id="axes-dropdown"
                    pullRight
                    disabled={!canClick}
                >
                    <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
                    <MenuItem
                        eventKey="G92 X0 Y0 Z0"
                        onSelect={handleSelect}
                        disabled={!canClick}
                    >
                        {i18n._('Zero Out Temporary Offsets (G92 X0 Y0 Z0)')}
                    </MenuItem>
                    <MenuItem
                        eventKey="G92.1 X0 Y0 Z0"
                        onSelect={handleSelect}
                        disabled={!canClick}
                    >
                        {i18n._('Un-Zero Out Temporary Offsets (G92.1 X0 Y0 Z0)')}
                    </MenuItem>
                    <MenuItem divider />
                    <MenuItem header>{i18n._('Work Coordinate System (G54)')}</MenuItem>
                    <MenuItem
                        eventKey="G0 X0 Y0 Z0"
                        onSelect={handleSelect}
                        disabled={!canClick}
                    >
                        {i18n._('Go To Work Zero (G0 X0 Y0 Z0)')}
                    </MenuItem>
                    <MenuItem
                        eventKey="G10 L20 P1 X0 Y0 Z0"
                        onSelect={handleSelect}
                        disabled={!canClick}
                    >
                        {i18n._('Zero Out Work Offsets (G10 L20 P1 X0 Y0 Z0)')}
                    </MenuItem>
                    <MenuItem divider />
                    <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
                    <MenuItem
                        eventKey="G53 G0 X0 Y0 Z0"
                        onSelect={handleSelect}
                        disabled={!canClick}
                    >
                        {i18n._('Go To Machine Zero (G53 G0 X0 Y0 Z0)')}
                    </MenuItem>
                </DropdownButton>
            </div>
        </div>
    );
};

ToolbarButton.propTypes = {
    port: React.PropTypes.string,
    unit: React.PropTypes.string,
    activeState: React.PropTypes.string
};

export default ToolbarButton;
