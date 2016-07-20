import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import i18n from '../../../lib/i18n';
import controller from '../../../lib/controller';

class ToolbarButton extends Component {
    static propTypes = {
        state: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props);
    }
    handleSelect(eventKey) {
        const data = eventKey;
        if (data) {
            controller.command('gcode', data);
        }
    }
    render() {
        const { state } = this.props;
        const { canClick } = state;

        return (
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
                        onSelect={::this.handleSelect}
                        disabled={!canClick}
                    >
                        {i18n._('Cancel Tool Length Offset (G49)')}
                    </MenuItem>
                </DropdownButton>
            </div>
        );
    }
}

export default ToolbarButton;
