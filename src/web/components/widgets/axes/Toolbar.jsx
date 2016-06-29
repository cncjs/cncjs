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
                            <div><span className="axis-direction">X+</span><kbd><i className="fa fa-angle-right" /></kbd>&nbsp;{i18n._('Right')}</div>
                            <div><span className="axis-direction">X-</span><kbd><i className="fa fa-angle-left" /></kbd>&nbsp;{i18n._('Left')}</div>
                            <div><span className="axis-direction">Y+</span><kbd><i className="fa fa-angle-up" /></kbd>&nbsp;{i18n._('Up')}</div>
                            <div><span className="axis-direction">Y-</span><kbd><i className="fa fa-angle-down" /></kbd>&nbsp;{i18n._('Down')}</div>
                            <div><span className="axis-direction">Z+</span><kbd><i className="fa fa-long-arrow-up" /></kbd>&nbsp;{i18n._('Page Up')}</div>
                            <div><span className="axis-direction">Z-</span><kbd><i className="fa fa-long-arrow-down" /></kbd>&nbsp;{i18n._('Page Down')}</div>
                            <div className="divider"></div>
                            <table>
                                <tbody>
                                    <tr>
                                        <td><kbd className="nowrap">{i18n._('Alt')}</kbd></td>
                                        <td className="text-right nowrap">{i18n._('0.1x Move')}</td>
                                    </tr>
                                    <tr>
                                        <td><kbd className="nowrap">{i18n._('⇧ Shift')}</kbd></td>
                                        <td className="text-right nowrap">{i18n._('10x Move')}</td>
                                    </tr>
                                </tbody>
                            </table>
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
