import { includes, isEqual } from 'lodash';
import React, { Component, PropTypes } from 'react';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import CSSModules from 'react-css-modules';
import { in2mm } from '../../lib/units';
import i18n from '../../lib/i18n';
import controller from '../../lib/controller';
import PositionInput from './PositionInput';
import {
    IMPERIAL_UNITS,
    METRIC_UNITS
} from '../../constants';
import styles from './index.styl';

@CSSModules(styles)
class DisplayPanel extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    state = {
        showXPositionInput: false,
        showYPositionInput: false,
        showZPositionInput: false,
        showAPositionInput: false
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !isEqual(nextProps, this.props) || !isEqual(nextState, this.state);
    }
    handleSelect(eventKey) {
        const data = eventKey;
        if (data) {
            controller.command('gcode', data);
        }
    }
    render() {
        const { state, actions } = this.props;
        const { units, canClick, axes, machinePosition, workPosition } = state;
        const displayUnits = (units === METRIC_UNITS) ? i18n._('mm') : i18n._('in');
        const wcs = actions.getWorkCoordinateSystem();

        return (
            <div styleName="display-panel">
                <table className="table-bordered">
                    <thead>
                        <tr>
                            <th className="nowrap" title={i18n._('Axis')}>{i18n._('Axis')}</th>
                            <th title={i18n._('Machine Position')}>{i18n._('Machine Position')}</th>
                            <th title={i18n._('Work Position')}>{i18n._('Work Position')}</th>
                            <th className="nowrap" title={i18n._('Action')}>{i18n._('Action')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {includes(axes, 'x') &&
                        <tr>
                            <td styleName="coordinate">X</td>
                            <td styleName="machine-position">
                                <span styleName="integer-part">{machinePosition.x.split('.')[0]}</span>
                                <span styleName="decimal-point">.</span>
                                <span styleName="fractional-part">{machinePosition.x.split('.')[1]}</span>
                                <span styleName="dimension-units">{displayUnits}</span>
                            </td>
                            <td styleName="work-position">
                                <span styleName="dimension-units">{displayUnits}</span>
                                {this.state.showXPositionInput &&
                                <PositionInput
                                    onOK={(value) => {
                                        if (units === IMPERIAL_UNITS) {
                                            value = in2mm(value);
                                        }
                                        controller.command('gcode', 'G10 L20 P1 X' + value);
                                        this.setState({ showXPositionInput: false });
                                    }}
                                    onCancel={() => {
                                        this.setState({ showXPositionInput: false });
                                    }}
                                />
                                }
                                {!this.state.showXPositionInput &&
                                <div
                                    style={{ cursor: canClick ? 'pointer' : 'auto' }}
                                    title={i18n._('Edit')}
                                    onClick={() => {
                                        if (canClick) {
                                            this.setState({ showXPositionInput: true });
                                        }
                                    }}
                                >
                                    <span styleName="integer-part">{workPosition.x.split('.')[0]}</span>
                                    <span styleName="decimal-point">.</span>
                                    <span styleName="fractional-part">{workPosition.x.split('.')[1]}</span>
                                </div>
                                }
                            </td>
                            <td styleName="action">
                                <DropdownButton
                                    bsSize="xs"
                                    bsStyle="default"
                                    title="X"
                                    id="axis-x-dropdown"
                                    pullRight
                                    disabled={!canClick}
                                >
                                    <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
                                    <MenuItem
                                        eventKey="G92 X0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Temporary X Axis (G92 X0)')}
                                    </MenuItem>
                                    <MenuItem
                                        eventKey="G92.1 X0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Un-Zero Out Temporary X Axis (G92.1 X0)')}
                                    </MenuItem>
                                    <MenuItem divider />
                                    {wcs === 'G54' &&
                                    <MenuItem header>{i18n._('Work Coordinate System (G54)')}</MenuItem>
                                    }
                                    {wcs === 'G55' &&
                                    <MenuItem header>{i18n._('Work Coordinate System (G55)')}</MenuItem>
                                    }
                                    {wcs === 'G56' &&
                                    <MenuItem header>{i18n._('Work Coordinate System (G56)')}</MenuItem>
                                    }
                                    {wcs === 'G57' &&
                                    <MenuItem header>{i18n._('Work Coordinate System (G57)')}</MenuItem>
                                    }
                                    {wcs === 'G58' &&
                                    <MenuItem header>{i18n._('Work Coordinate System (G58)')}</MenuItem>
                                    }
                                    {wcs === 'G59' &&
                                    <MenuItem header>{i18n._('Work Coordinate System (G59)')}</MenuItem>
                                    }
                                    <MenuItem
                                        eventKey="G0 X0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Go To Work Zero On X Axis (G0 X0)')}
                                    </MenuItem>
                                    {wcs === 'G54' &&
                                    <MenuItem
                                        eventKey="G10 L20 P1 X0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Work X Axis (G10 L20 P1 X0)')}
                                    </MenuItem>
                                    }
                                    {wcs === 'G55' &&
                                    <MenuItem
                                        eventKey="G10 L20 P2 X0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Work X Axis (G10 L20 P2 X0)')}
                                    </MenuItem>
                                    }
                                    {wcs === 'G56' &&
                                    <MenuItem
                                        eventKey="G10 L20 P3 X0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Work X Axis (G10 L20 P3 X0)')}
                                    </MenuItem>
                                    }
                                    {wcs === 'G57' &&
                                    <MenuItem
                                        eventKey="G10 L20 P4 X0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Work X Axis (G10 L20 P4 X0)')}
                                    </MenuItem>
                                    }
                                    {wcs === 'G58' &&
                                    <MenuItem
                                        eventKey="G10 L20 P5 X0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Work X Axis (G10 L20 P5 X0)')}
                                    </MenuItem>
                                    }
                                    {wcs === 'G59' &&
                                    <MenuItem
                                        eventKey="G10 L20 P6 X0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Work X Axis (G10 L20 P6 X0)')}
                                    </MenuItem>
                                    }
                                    <MenuItem divider />
                                    <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
                                    <MenuItem
                                        eventKey="G53 G0 X0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Go To Machine Zero On X Axis (G53 G0 X0)')}
                                    </MenuItem>
                                </DropdownButton>
                            </td>
                        </tr>
                        }
                        {includes(axes, 'y') &&
                        <tr>
                            <td styleName="coordinate">Y</td>
                            <td styleName="machine-position">
                                <span styleName="integer-part">{machinePosition.y.split('.')[0]}</span>
                                <span styleName="decimal-point">.</span>
                                <span styleName="fractional-part">{machinePosition.y.split('.')[1]}</span>
                                <span styleName="dimension-units">{displayUnits}</span>
                            </td>
                            <td styleName="work-position">
                                <span styleName="dimension-units">{displayUnits}</span>
                                {this.state.showYPositionInput &&
                                <PositionInput
                                    onOK={(value) => {
                                        if (units === IMPERIAL_UNITS) {
                                            value = in2mm(value);
                                        }
                                        controller.command('gcode', 'G10 L20 P1 Y' + value);
                                        this.setState({ showYPositionInput: false });
                                    }}
                                    onCancel={() => {
                                        this.setState({ showYPositionInput: false });
                                    }}
                                />
                                }
                                {!this.state.showYPositionInput &&
                                <div
                                    style={{ cursor: canClick ? 'pointer' : 'auto' }}
                                    title={i18n._('Edit')}
                                    onClick={() => {
                                        if (canClick) {
                                            this.setState({ showYPositionInput: true });
                                        }
                                    }}
                                >
                                    <span styleName="integer-part">{workPosition.y.split('.')[0]}</span>
                                    <span styleName="decimal-point">.</span>
                                    <span styleName="fractional-part">{workPosition.y.split('.')[1]}</span>
                                </div>
                                }
                            </td>
                            <td styleName="action">
                                <DropdownButton
                                    bsSize="xs"
                                    bsStyle="default"
                                    title="Y"
                                    id="axis-y-dropdown"
                                    pullRight
                                    disabled={!canClick}
                                >
                                    <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
                                    <MenuItem
                                        eventKey="G92 Y0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Temporary Y Axis (G92 Y0)')}
                                    </MenuItem>
                                    <MenuItem
                                        eventKey="G92.1 Y0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Un-Zero Out Temporary Y Axis (G92.1 Y0)')}
                                    </MenuItem>
                                    <MenuItem divider />
                                    {wcs === 'G54' &&
                                    <MenuItem header>{i18n._('Work Coordinate System (G54)')}</MenuItem>
                                    }
                                    {wcs === 'G55' &&
                                    <MenuItem header>{i18n._('Work Coordinate System (G55)')}</MenuItem>
                                    }
                                    {wcs === 'G56' &&
                                    <MenuItem header>{i18n._('Work Coordinate System (G56)')}</MenuItem>
                                    }
                                    {wcs === 'G57' &&
                                    <MenuItem header>{i18n._('Work Coordinate System (G57)')}</MenuItem>
                                    }
                                    {wcs === 'G58' &&
                                    <MenuItem header>{i18n._('Work Coordinate System (G58)')}</MenuItem>
                                    }
                                    {wcs === 'G59' &&
                                    <MenuItem header>{i18n._('Work Coordinate System (G59)')}</MenuItem>
                                    }
                                    <MenuItem
                                        eventKey="G0 Y0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Go To Work Zero On Y Axis (G0 Y0)')}
                                    </MenuItem>
                                    {wcs === 'G54' &&
                                    <MenuItem
                                        eventKey="G10 L20 P1 Y0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Work Y Axis (G10 L20 P1 Y0)')}
                                    </MenuItem>
                                    }
                                    {wcs === 'G55' &&
                                    <MenuItem
                                        eventKey="G10 L20 P2 Y0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Work Y Axis (G10 L20 P2 Y0)')}
                                    </MenuItem>
                                    }
                                    {wcs === 'G56' &&
                                    <MenuItem
                                        eventKey="G10 L20 P3 Y0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Work Y Axis (G10 L20 P3 Y0)')}
                                    </MenuItem>
                                    }
                                    {wcs === 'G57' &&
                                    <MenuItem
                                        eventKey="G10 L20 P4 Y0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Work Y Axis (G10 L20 P4 Y0)')}
                                    </MenuItem>
                                    }
                                    {wcs === 'G58' &&
                                    <MenuItem
                                        eventKey="G10 L20 P5 Y0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Work Y Axis (G10 L20 P5 Y0)')}
                                    </MenuItem>
                                    }
                                    {wcs === 'G59' &&
                                    <MenuItem
                                        eventKey="G10 L20 P6 Y0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Work Y Axis (G10 L20 P6 Y0)')}
                                    </MenuItem>
                                    }
                                    <MenuItem divider />
                                    <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
                                    <MenuItem
                                        eventKey="G53 G0 Y0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Go To Machine Zero On Y Axis (G53 G0 Y0)')}
                                    </MenuItem>
                                </DropdownButton>
                            </td>
                        </tr>
                        }
                        {includes(axes, 'z') &&
                        <tr>
                            <td styleName="coordinate">Z</td>
                            <td styleName="machine-position">
                                <span styleName="integer-part">{machinePosition.z.split('.')[0]}</span>
                                <span styleName="decimal-point">.</span>
                                <span styleName="fractional-part">{machinePosition.z.split('.')[1]}</span>
                                <span styleName="dimension-units">{displayUnits}</span>
                            </td>
                            <td styleName="work-position">
                                <span styleName="dimension-units">{displayUnits}</span>
                                {this.state.showZPositionInput &&
                                <PositionInput
                                    onOK={(value) => {
                                        if (units === IMPERIAL_UNITS) {
                                            value = in2mm(value);
                                        }
                                        controller.command('gcode', 'G10 L20 P1 Z' + value);
                                        this.setState({ showZPositionInput: false });
                                    }}
                                    onCancel={() => {
                                        this.setState({ showZPositionInput: false });
                                    }}
                                />
                                }
                                {!this.state.showZPositionInput &&
                                <div
                                    style={{ cursor: canClick ? 'pointer' : 'auto' }}
                                    title={i18n._('Edit')}
                                    onClick={() => {
                                        if (canClick) {
                                            this.setState({ showZPositionInput: true });
                                        }
                                    }}
                                >
                                    <span styleName="integer-part">{workPosition.z.split('.')[0]}</span>
                                    <span styleName="decimal-point">.</span>
                                    <span styleName="fractional-part">{workPosition.z.split('.')[1]}</span>
                                </div>
                                }
                            </td>
                            <td styleName="action">
                                <DropdownButton
                                    bsSize="xs"
                                    bsStyle="default"
                                    title="Z"
                                    id="axis-z-dropdown"
                                    pullRight
                                    disabled={!canClick}
                                >
                                    <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
                                    <MenuItem
                                        eventKey="G92 Z0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Temporary Z Axis (G92 Z0)')}
                                    </MenuItem>
                                    <MenuItem
                                        eventKey="G92.1 Z0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Un-Zero Out Temporary Z Axis (G92.1 Z0)')}
                                    </MenuItem>
                                    <MenuItem divider />
                                    {wcs === 'G54' &&
                                    <MenuItem header>{i18n._('Work Coordinate System (G54)')}</MenuItem>
                                    }
                                    {wcs === 'G55' &&
                                    <MenuItem header>{i18n._('Work Coordinate System (G55)')}</MenuItem>
                                    }
                                    {wcs === 'G56' &&
                                    <MenuItem header>{i18n._('Work Coordinate System (G56)')}</MenuItem>
                                    }
                                    {wcs === 'G57' &&
                                    <MenuItem header>{i18n._('Work Coordinate System (G57)')}</MenuItem>
                                    }
                                    {wcs === 'G58' &&
                                    <MenuItem header>{i18n._('Work Coordinate System (G58)')}</MenuItem>
                                    }
                                    {wcs === 'G59' &&
                                    <MenuItem header>{i18n._('Work Coordinate System (G59)')}</MenuItem>
                                    }
                                    <MenuItem
                                        eventKey="G0 Z0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Go To Work Zero On Z Axis (G0 Z0)')}
                                    </MenuItem>
                                    {wcs === 'G54' &&
                                    <MenuItem
                                        eventKey="G10 L20 P1 Z0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Work Z Axis (G10 L20 P1 Z0)')}
                                    </MenuItem>
                                    }
                                    {wcs === 'G55' &&
                                    <MenuItem
                                        eventKey="G10 L20 P2 Z0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Work Z Axis (G10 L20 P2 Z0)')}
                                    </MenuItem>
                                    }
                                    {wcs === 'G56' &&
                                    <MenuItem
                                        eventKey="G10 L20 P3 Z0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Work Z Axis (G10 L20 P3 Z0)')}
                                    </MenuItem>
                                    }
                                    {wcs === 'G57' &&
                                    <MenuItem
                                        eventKey="G10 L20 P4 Z0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Work Z Axis (G10 L20 P4 Z0)')}
                                    </MenuItem>
                                    }
                                    {wcs === 'G58' &&
                                    <MenuItem
                                        eventKey="G10 L20 P5 Z0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Work Z Axis (G10 L20 P5 Z0)')}
                                    </MenuItem>
                                    }
                                    {wcs === 'G59' &&
                                    <MenuItem
                                        eventKey="G10 L20 P6 Z0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Work Z Axis (G10 L20 P6 Z0)')}
                                    </MenuItem>
                                    }
                                    <MenuItem divider />
                                    <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
                                    <MenuItem
                                        eventKey="G53 G0 Z0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Go To Machine Zero On Z Axis (G53 G0 Z0)')}
                                    </MenuItem>
                                </DropdownButton>
                            </td>
                        </tr>
                        }
                        {includes(axes, 'a') &&
                        <tr>
                            <td styleName="coordinate">A</td>
                            <td styleName="machine-position">
                                <span styleName="integer-part">{machinePosition.a.split('.')[0]}</span>
                                <span styleName="decimal-point">.</span>
                                <span styleName="fractional-part">{machinePosition.a.split('.')[1]}</span>
                                <span styleName="dimension-units">{displayUnits}</span>
                            </td>
                            <td styleName="work-position">
                                <span styleName="dimension-units">{displayUnits}</span>
                                {this.state.showAPositionInput &&
                                <PositionInput
                                    onOK={(value) => {
                                        if (units === IMPERIAL_UNITS) {
                                            value = in2mm(value);
                                        }
                                        controller.command('gcode', 'G10 L20 P1 A' + value);
                                        this.setState({ showAPositionInput: false });
                                    }}
                                    onCancel={() => {
                                        this.setState({ showAPositionInput: false });
                                    }}
                                />
                                }
                                {!this.state.showAPositionInput &&
                                <div
                                    style={{ cursor: canClick ? 'pointer' : 'auto' }}
                                    title={i18n._('Edit')}
                                    onClick={() => {
                                        if (canClick) {
                                            this.setState({ showAPositionInput: true });
                                        }
                                    }}
                                >
                                    <span styleName="integer-part">{workPosition.a.split('.')[0]}</span>
                                    <span styleName="decimal-point">.</span>
                                    <span styleName="fractional-part">{workPosition.a.split('.')[1]}</span>
                                </div>
                                }
                            </td>
                            <td styleName="action">
                                <DropdownButton
                                    bsSize="xs"
                                    bsStyle="default"
                                    title="A"
                                    id="axis-a-dropdown"
                                    pullRight
                                    disabled={!canClick}
                                >
                                    <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
                                    <MenuItem
                                        eventKey="G92 A0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Temporary A Axis (G92 A0)')}
                                    </MenuItem>
                                    <MenuItem
                                        eventKey="G92.1 A0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Un-Zero Out Temporary A Axis (G92.1 A0)')}
                                    </MenuItem>
                                    <MenuItem divider />
                                    {wcs === 'G54' &&
                                    <MenuItem header>{i18n._('Work Coordinate System (G54)')}</MenuItem>
                                    }
                                    {wcs === 'G55' &&
                                    <MenuItem header>{i18n._('Work Coordinate System (G55)')}</MenuItem>
                                    }
                                    {wcs === 'G56' &&
                                    <MenuItem header>{i18n._('Work Coordinate System (G56)')}</MenuItem>
                                    }
                                    {wcs === 'G57' &&
                                    <MenuItem header>{i18n._('Work Coordinate System (G57)')}</MenuItem>
                                    }
                                    {wcs === 'G58' &&
                                    <MenuItem header>{i18n._('Work Coordinate System (G58)')}</MenuItem>
                                    }
                                    {wcs === 'G59' &&
                                    <MenuItem header>{i18n._('Work Coordinate System (G59)')}</MenuItem>
                                    }
                                    <MenuItem
                                        eventKey="G0 A0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Go To Work Zero On A Axis (G0 A0)')}
                                    </MenuItem>
                                    {wcs === 'G54' &&
                                    <MenuItem
                                        eventKey="G10 L20 P1 A0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Work A Axis (G10 L20 P1 A0)')}
                                    </MenuItem>
                                    }
                                    {wcs === 'G55' &&
                                    <MenuItem
                                        eventKey="G10 L20 P2 A0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Work A Axis (G10 L20 P2 A0)')}
                                    </MenuItem>
                                    }
                                    {wcs === 'G56' &&
                                    <MenuItem
                                        eventKey="G10 L20 P3 A0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Work A Axis (G10 L20 P3 A0)')}
                                    </MenuItem>
                                    }
                                    {wcs === 'G57' &&
                                    <MenuItem
                                        eventKey="G10 L20 P4 A0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Work A Axis (G10 L20 P4 A0)')}
                                    </MenuItem>
                                    }
                                    {wcs === 'G58' &&
                                    <MenuItem
                                        eventKey="G10 L20 P5 A0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Work A Axis (G10 L20 P5 A0)')}
                                    </MenuItem>
                                    }
                                    {wcs === 'G59' &&
                                    <MenuItem
                                        eventKey="G10 L20 P6 A0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Zero Out Work A Axis (G10 L20 P6 A0)')}
                                    </MenuItem>
                                    }
                                    <MenuItem divider />
                                    <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
                                    <MenuItem
                                        eventKey="G53 G0 A0"
                                        onSelect={::this.handleSelect}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Go To Machine Zero On A Axis (G53 G0 A0)')}
                                    </MenuItem>
                                </DropdownButton>
                            </td>
                        </tr>
                        }
                    </tbody>
                </table>
            </div>
        );
    }
}

export default DisplayPanel;
