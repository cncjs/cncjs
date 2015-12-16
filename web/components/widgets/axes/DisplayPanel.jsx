import _ from 'lodash';
import i18n from 'i18next';
import React from 'react';
import serialport from '../../../lib/serialport';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import {
    ACTIVE_STATE_RUN,
    IMPERIAL_UNIT,
    METRIC_UNIT
} from './constants';

class DisplayPanel extends React.Component {
    static propTypes = {
        port: React.PropTypes.string,
        unit: React.PropTypes.string,
        activeState: React.PropTypes.string,
        machinePos: React.PropTypes.object,
        workingPos: React.PropTypes.object
    }

    handleSendCommand(target, eventKey) {
        let cmd = eventKey;
        if (cmd) {
            serialport.writeln(cmd);
        }
    }
    toUnitString(val) {
        val = Number(val) || 0;
        if (this.props.unit === METRIC_UNIT) {
            val = (val / 1).toFixed(3);
        } else {
            val = (val / 25.4).toFixed(4);
        }
        return '' + val;
    }
    render() {
        let { port, unit, activeState } = this.props;
        let machinePos = _.mapValues(this.props.machinePos, (pos, axis) => this.toUnitString(pos));
        let workingPos = _.mapValues(this.props.workingPos, (pos, axis) => this.toUnitString(pos));
        let canClick = (!!port && (activeState !== ACTIVE_STATE_RUN));

        return (
            <div className="container-fluid display-panel">
                <div className="row">
                    <div className="active-state">
                        {i18n._('Active state:')}&nbsp;{activeState}
                    </div>
                    <table className="table-bordered">
                        <thead>
                            <tr>
                                <th>{i18n._('Axis')}</th>
                                <th>{i18n._('Machine Position')}</th>
                                <th>{i18n._('Working Position')}</th>
                                <th>{i18n._('Action')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="axis-label">
                                    X
                                </td>
                                <td className="axis-position">
                                    <span className="integer-part">{machinePos.x.split('.')[0]}</span>
                                    <span className="decimal-point">.</span>
                                    <span className="fractional-part">{machinePos.x.split('.')[1]}</span>
                                    <span className="dimension-unit">{unit}</span>
                                </td>
                                <td className="axis-position">
                                    <span className="integer-part">{workingPos.x.split('.')[0]}</span>
                                    <span className="decimal-point">.</span>
                                    <span className="fractional-part">{workingPos.x.split('.')[1]}</span>
                                    <span className="dimension-unit">{unit}</span>
                                </td>
                                <td className="axis-control">
                                    <DropdownButton bsSize="xs" bsStyle="default" title="" id="axis-x-dropdown" pullRight>
                                        <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
                                        <MenuItem eventKey='G92 X0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Zero Out Temporary X Axis (G92 X0)')}</MenuItem>
                                        <MenuItem eventKey='G92.1 X0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Un-Zero Out Temporary X Axis (G92.1 X0)')}</MenuItem>
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Work Coordinate System (G54)')}</MenuItem>
                                        <MenuItem eventKey='G0 X0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Go To Work Zero On X Axis (G0 X0)')}</MenuItem>
                                        <MenuItem eventKey='G10 L2 P1 X0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Zero Out Work X Axis (G10 L2 P1 X0)')}</MenuItem>
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
                                        <MenuItem eventKey='G53 G0 X0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Go To Machine Zero On X Axis (G53 G0 X0)')}</MenuItem>
                                    </DropdownButton>
                                </td>
                            </tr>
                            <tr>
                                <td className="axis-label">
                                    Y
                                </td>
                                <td className="axis-position">
                                    <span className="integer-part">{machinePos.y.split('.')[0]}</span>
                                    <span className="decimal-point">.</span>
                                    <span className="fractional-part">{machinePos.y.split('.')[1]}</span>
                                    <span className="dimension-unit">{unit}</span>
                                </td>
                                <td className="axis-position">
                                    <span className="integer-part">{workingPos.y.split('.')[0]}</span>
                                    <span className="decimal-point">.</span>
                                    <span className="fractional-part">{workingPos.y.split('.')[1]}</span>
                                    <span className="dimension-unit">{unit}</span>
                                </td>
                                <td className="axis-control">
                                    <DropdownButton bsSize="xs" bsStyle="default" title="" id="axis-y-dropdown" pullRight>
                                        <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
                                        <MenuItem eventKey='G92 Y0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Zero Out Temporary Y Axis (G92 Y0)')}</MenuItem>
                                        <MenuItem eventKey='G92.1 Y0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Un-Zero Out Temporary Y Axis (G92.1 Y0)')}</MenuItem>
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Work Coordinate System (G54)')}</MenuItem>
                                        <MenuItem eventKey='G0 Y0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Go To Work Zero On Y Axis (G0 Y0)')}</MenuItem>
                                        <MenuItem eventKey='G10 L2 P1 Y0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Zero Out Work Y Axis (G10 L2 P1 Y0)')}</MenuItem>
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
                                        <MenuItem eventKey='G53 G0 Y0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Go To Machine Zero On Y Axis (G53 G0 Y0)')}</MenuItem>
                                    </DropdownButton>
                                </td>
                            </tr>
                            <tr>
                                <td className="axis-label">
                                    Z
                                </td>
                                <td className="axis-position">
                                    <span className="integer-part">{machinePos.z.split('.')[0]}</span>
                                    <span className="decimal-point">.</span>
                                    <span className="fractional-part">{machinePos.z.split('.')[1]}</span>
                                    <span className="dimension-unit">{unit}</span>
                                </td>
                                <td className="axis-position">
                                    <span className="integer-part">{workingPos.z.split('.')[0]}</span>
                                    <span className="decimal-point">.</span>
                                    <span className="fractional-part">{workingPos.z.split('.')[1]}</span>
                                    <span className="dimension-unit">{unit}</span>
                                </td>
                                <td className="axis-control">
                                    <DropdownButton bsSize="xs" bsStyle="default" title="" id="axis-z-dropdown" pullRight>
                                        <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
                                        <MenuItem eventKey='G92 Z0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Zero Out Temporary Z Axis (G92 Z0)')}</MenuItem>
                                        <MenuItem eventKey='G92.1 Z0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Un-Zero Out Temporary Z Axis (G92.1 Z0)')}</MenuItem>
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Work Coordinate System (G54)')}</MenuItem>
                                        <MenuItem eventKey='G0 Z0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Go To Work Zero On Z Axis (G0 Z0)')}</MenuItem>
                                        <MenuItem eventKey='G10 L2 P1 Z0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Zero Out Work Z Axis (G10 L2 P1 Z0)')}</MenuItem>
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
                                        <MenuItem eventKey='G53 G0 Z0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Go To Machine Zero On X Axis (G53 G0 Z0)')}</MenuItem>
                                    </DropdownButton>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
}

export default DisplayPanel;
