import classNames from 'classnames';
import { isEqual } from 'lodash';
import React, { Component, PropTypes } from 'react';
import ReactTooltip from 'react-tooltip';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import i18n from '../../../lib/i18n';
import controller from '../../../lib/controller';

class ToolbarButton extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !isEqual(nextProps, this.props);
    }
    handleSelect(eventKey) {
        const data = eventKey;
        if (data) {
            controller.writeln(data);
        }
    }
    render() {
        const { state, actions } = this.props;
        const { canClick, keypadJogging } = state;

        return (
            <div className="toolbar-button clearfix">
                <div className="btn-group pull-left">
                    <button
                        type="button"
                        className={classNames(
                            'btn',
                            'btn-xs',
                            'btn-default',
                            { 'btn-select': keypadJogging }
                        )}
                        onClick={actions.toggleKeypadJogging}
                        disabled={!canClick}
                        data-tip
                        data-for="keypad"
                    >
                        <i className="fa fa-keyboard-o" style={{ fontSize: 14 }} />
                        &nbsp;
                        {i18n._('Keypad')}
                    </button>
                    <ReactTooltip
                        border={true}
                        id="keypad"
                        place="top"
                        type="dark"
                        effect="solid"
                        delayShow={250}
                    >
                        <div className="keypad-tooltip">
                            <div>X+: <i className="fa fa-toggle-right" /> {i18n._('Right Arrow')}</div>
                            <div>X-: <i className="fa fa-toggle-left" /> {i18n._('Left Arrow')}</div>
                            <div>Y+: <i className="fa fa-toggle-up" /> {i18n._('Up Arrow')}</div>
                            <div>Y-: <i className="fa fa-toggle-down" /> {i18n._('Down Arrow')}</div>
                            <div>Z+: <i className="fa fa-arrow-circle-up" /> {i18n._('Page Up')}</div>
                            <div>Z-: <i className="fa fa-arrow-circle-down" /> {i18n._('Page Down')}</div>
                            <div className="divider"></div>
                            <div>Alt: {i18n._('0.1x Move')}</div>
                            <div>Shift: {i18n._('10x Move')}</div>
                        </div>
                    </ReactTooltip>
                </div>
                <div className="btn-group pull-right">
                    <button
                        type="button"
                        className="btn btn-xs btn-default"
                        onClick={actions.toggleDisplayUnit}
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
