import classNames from 'classnames';
import { isEqual } from 'lodash';
import React, { Component, PropTypes } from 'react';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import i18n from '../../../lib/i18n';
import controller from '../../../lib/controller';
import {
    ACTIVE_STATE_IDLE,
    METRIC_UNIT
} from './constants';

class ToolbarButton extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !isEqual(nextProps, this.props);
    }
    toggleDisplayUnit() {
        const { state } = this.props;
        const { unit } = state;

        if (unit === METRIC_UNIT) {
            controller.writeln('G20'); // G20 specifies Imperial unit
        } else {
            controller.writeln('G21'); // G21 specifies Metric unit
        }
    }
    handleSelect(eventKey) {
        const data = eventKey;
        if (data) {
            controller.writeln(data);
        }
    }
    render() {
        const { state, actions } = this.props;
        const { port, activeState, jogMode } = state;
        const canClick = (!!port && (activeState === ACTIVE_STATE_IDLE));

        return (
            <div>
                <div className="toolbar-button btn-group">
                    <button
                        type="button"
                        className="btn btn-xs btn-default"
                        onClick={actions.toggleJogMode}
                        disabled={!canClick}
                    >
                        <i
                            className={classNames(
                                'fa',
                                { 'fa-toggle-on': !jogMode },
                                { 'fa-toggle-off': jogMode }
                            )}
                        />
                        &nbsp;
                        {i18n._('Jog')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-xs btn-default"
                        onClick={::this.toggleDisplayUnit}
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
                            onSelect={::this.handleSelect}
                            disabled={!canClick}
                        >
                            {i18n._('Zero Out Temporary Offsets (G92 X0 Y0 Z0)')}
                        </MenuItem>
                        <MenuItem
                            eventKey="G92.1 X0 Y0 Z0"
                            onSelect={::this.handleSelect}
                            disabled={!canClick}
                        >
                            {i18n._('Un-Zero Out Temporary Offsets (G92.1 X0 Y0 Z0)')}
                        </MenuItem>
                        <MenuItem divider />
                        <MenuItem header>{i18n._('Work Coordinate System (G54)')}</MenuItem>
                        <MenuItem
                            eventKey="G0 X0 Y0 Z0"
                            onSelect={::this.handleSelect}
                            disabled={!canClick}
                        >
                            {i18n._('Go To Work Zero (G0 X0 Y0 Z0)')}
                        </MenuItem>
                        <MenuItem
                            eventKey="G10 L20 P1 X0 Y0 Z0"
                            onSelect={::this.handleSelect}
                            disabled={!canClick}
                        >
                            {i18n._('Zero Out Work Offsets (G10 L20 P1 X0 Y0 Z0)')}
                        </MenuItem>
                        <MenuItem divider />
                        <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
                        <MenuItem
                            eventKey="G53 G0 X0 Y0 Z0"
                            onSelect={::this.handleSelect}
                            disabled={!canClick}
                        >
                            {i18n._('Go To Machine Zero (G53 G0 X0 Y0 Z0)')}
                        </MenuItem>
                    </DropdownButton>
                </div>
            </div>
        );
    }
}

export default ToolbarButton;
