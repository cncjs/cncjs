import React from 'react';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import i18n from '../../../lib/i18n';
import controller from '../../../lib/controller';
import {
    GRBL_ACTIVE_STATE_IDLE
} from '../../../constants';

const ToolbarButton = ({ port, activeState }) => {
    const handleSelect = (eventKey) => {
        const data = eventKey;
        if (data) {
            controller.writeln(data);
        }
    };

    const canClick = (!!port && (activeState === GRBL_ACTIVE_STATE_IDLE));

    return (
        <div>
            <div className="toolbar-button btn-group">
                <DropdownButton
                    bsSize="xs"
                    bsStyle="default"
                    title={i18n._('More')}
                    id="probe-dropdown"
                    pullRight
                    disabled={!canClick}
                >
                    <MenuItem
                        eventKey="G49"
                        onSelect={handleSelect}
                        disabled={!canClick}
                    >
                        {i18n._('Cancel Tool Length Offset (G49)')}
                    </MenuItem>
                </DropdownButton>
            </div>
        </div>
    );
};

ToolbarButton.propTypes = {
    port: React.PropTypes.string,
    activeState: React.PropTypes.string
};

export default ToolbarButton;
