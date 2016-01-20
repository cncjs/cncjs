import _ from 'lodash';
import React from 'react';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import i18n from '../../../lib/i18n';
import controller from '../../../lib/controller';
import {
    ACTIVE_STATE_IDLE
} from './constants';

class ToolbarButton extends React.Component {
    static propTypes = {
        port: React.PropTypes.string,
        activeState: React.PropTypes.string
    };

    handleSelect(target, eventKey) {
        let data = eventKey;
        if (data) {
            controller.writeln(data);
        }
    }
    render() {
        let { port, activeState } = this.props;
        let canClick = (!!port && (activeState === ACTIVE_STATE_IDLE));

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
                        <MenuItem eventKey='G49' onSelect={::this.handleSelect} disabled={!canClick}>{i18n._('Cancel Tool Length Offse (G49)')}</MenuItem>
                    </DropdownButton>
                </div>
            </div>
        );
    }
}

export default ToolbarButton;
