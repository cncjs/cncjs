import _ from 'lodash';
import colornames from 'colornames';
import i18n from 'i18next';
import React from 'react';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import serialport from '../../../lib/serialport';
import {
    ACTIVE_STATE_IDLE,
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

    handleSelect(target, eventKey) {
        let data = eventKey;
        if (data) {
            serialport.writeln(data);
        }
    }
    render() {
        let { port, unit, activeState, machinePos, workingPos } = this.props;
        let canClick = (!!port && (activeState === ACTIVE_STATE_IDLE));
        let displayUnit = (unit === METRIC_UNIT) ? i18n._('mm') : i18n._('in');
        let styles = {
            activeState: {
                 color: (activeState === 'Alarm') ? colornames('crimson') : colornames('gray 20')
            }
        };

        return (
            <div className="container-fluid display-panel">
                <div className="row no-gutter">
                    <div className="active-state">
                        {i18n._('Active state:')}&nbsp;<span style={styles.activeState}>{activeState}</span>
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
                                <td className="axis-label">X</td>
                                <td className="axis-position">
                                    <span className="integer-part">{machinePos.x.split('.')[0]}</span>
                                    <span className="decimal-point">.</span>
                                    <span className="fractional-part">{machinePos.x.split('.')[1]}</span>
                                    <span className="dimension-unit">{displayUnit}</span>
                                </td>
                                <td className="axis-position">
                                    <span className="integer-part">{workingPos.x.split('.')[0]}</span>
                                    <span className="decimal-point">.</span>
                                    <span className="fractional-part">{workingPos.x.split('.')[1]}</span>
                                    <span className="dimension-unit">{displayUnit}</span>
                                </td>
                                <td className="axis-control">
                                    <DropdownButton
                                        bsSize="xs"
                                        bsStyle="default"
                                        title="X"
                                        id="axis-x-dropdown"
                                        pullRight
                                        disabled={!canClick}
                                    >
                                        <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
                                        <MenuItem eventKey='G92 X0' onSelect={::this.handleSelect} disabled={!canClick}>{i18n._('Zero Out Temporary X Axis (G92 X0)')}</MenuItem>
                                        <MenuItem eventKey='G92.1 X0' onSelect={::this.handleSelect} disabled={!canClick}>{i18n._('Un-Zero Out Temporary X Axis (G92.1 X0)')}</MenuItem>
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Work Coordinate System (G54)')}</MenuItem>
                                        <MenuItem eventKey='G0 X0' onSelect={::this.handleSelect} disabled={!canClick}>{i18n._('Go To Work Zero On X Axis (G0 X0)')}</MenuItem>
                                        <MenuItem eventKey='G10 L20 P1 X0' onSelect={::this.handleSelect} disabled={!canClick}>{i18n._('Zero Out Work X Axis (G10 L20 P1 X0)')}</MenuItem>
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
                                        <MenuItem eventKey='G53 G0 X0' onSelect={::this.handleSelect} disabled={!canClick}>{i18n._('Go To Machine Zero On X Axis (G53 G0 X0)')}</MenuItem>
                                    </DropdownButton>
                                </td>
                            </tr>
                            <tr>
                                <td className="axis-label">Y</td>
                                <td className="axis-position">
                                    <span className="integer-part">{machinePos.y.split('.')[0]}</span>
                                    <span className="decimal-point">.</span>
                                    <span className="fractional-part">{machinePos.y.split('.')[1]}</span>
                                    <span className="dimension-unit">{displayUnit}</span>
                                </td>
                                <td className="axis-position">
                                    <span className="integer-part">{workingPos.y.split('.')[0]}</span>
                                    <span className="decimal-point">.</span>
                                    <span className="fractional-part">{workingPos.y.split('.')[1]}</span>
                                    <span className="dimension-unit">{displayUnit}</span>
                                </td>
                                <td className="axis-control">
                                    <DropdownButton
                                        bsSize="xs"
                                        bsStyle="default"
                                        title="Y"
                                        id="axis-y-dropdown"
                                        pullRight
                                        disabled={!canClick}
                                    >
                                        <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
                                        <MenuItem eventKey='G92 Y0' onSelect={::this.handleSelect} disabled={!canClick}>{i18n._('Zero Out Temporary Y Axis (G92 Y0)')}</MenuItem>
                                        <MenuItem eventKey='G92.1 Y0' onSelect={::this.handleSelect} disabled={!canClick}>{i18n._('Un-Zero Out Temporary Y Axis (G92.1 Y0)')}</MenuItem>
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Work Coordinate System (G54)')}</MenuItem>
                                        <MenuItem eventKey='G0 Y0' onSelect={::this.handleSelect} disabled={!canClick}>{i18n._('Go To Work Zero On Y Axis (G0 Y0)')}</MenuItem>
                                        <MenuItem eventKey='G10 L20 P1 Y0' onSelect={::this.handleSelect} disabled={!canClick}>{i18n._('Zero Out Work Y Axis (G10 L20 P1 Y0)')}</MenuItem>
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
                                        <MenuItem eventKey='G53 G0 Y0' onSelect={::this.handleSelect} disabled={!canClick}>{i18n._('Go To Machine Zero On Y Axis (G53 G0 Y0)')}</MenuItem>
                                    </DropdownButton>
                                </td>
                            </tr>
                            <tr>
                                <td className="axis-label">Z</td>
                                <td className="axis-position">
                                    <span className="integer-part">{machinePos.z.split('.')[0]}</span>
                                    <span className="decimal-point">.</span>
                                    <span className="fractional-part">{machinePos.z.split('.')[1]}</span>
                                    <span className="dimension-unit">{displayUnit}</span>
                                </td>
                                <td className="axis-position">
                                    <span className="integer-part">{workingPos.z.split('.')[0]}</span>
                                    <span className="decimal-point">.</span>
                                    <span className="fractional-part">{workingPos.z.split('.')[1]}</span>
                                    <span className="dimension-unit">{displayUnit}</span>
                                </td>
                                <td className="axis-control">
                                    <DropdownButton
                                        bsSize="xs"
                                        bsStyle="default"
                                        title="Z"
                                        id="axis-z-dropdown"
                                        pullRight
                                        disabled={!canClick}
                                    >
                                        <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
                                        <MenuItem eventKey='G92 Z0' onSelect={::this.handleSelect} disabled={!canClick}>{i18n._('Zero Out Temporary Z Axis (G92 Z0)')}</MenuItem>
                                        <MenuItem eventKey='G92.1 Z0' onSelect={::this.handleSelect} disabled={!canClick}>{i18n._('Un-Zero Out Temporary Z Axis (G92.1 Z0)')}</MenuItem>
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Work Coordinate System (G54)')}</MenuItem>
                                        <MenuItem eventKey='G0 Z0' onSelect={::this.handleSelect} disabled={!canClick}>{i18n._('Go To Work Zero On Z Axis (G0 Z0)')}</MenuItem>
                                        <MenuItem eventKey='G10 L20 P1 Z0' onSelect={::this.handleSelect} disabled={!canClick}>{i18n._('Zero Out Work Z Axis (G10 L20 P1 Z0)')}</MenuItem>
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
                                        <MenuItem eventKey='G53 G0 Z0' onSelect={::this.handleSelect} disabled={!canClick}>{i18n._('Go To Machine Zero On X Axis (G53 G0 Z0)')}</MenuItem>
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
