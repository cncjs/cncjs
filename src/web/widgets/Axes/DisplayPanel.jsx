import classNames from 'classnames';
import includes from 'lodash/includes';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import { in2mm } from '../../lib/units';
import Anchor from '../../components/Anchor';
import i18n from '../../lib/i18n';
import controller from '../../lib/controller';
import PositionInput from './PositionInput';
import {
    IMPERIAL_UNITS,
    METRIC_UNITS
} from '../../constants';
import styles from './index.styl';

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
        return shallowCompare(this, nextProps, nextState);
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
        const lengthUnits = (units === METRIC_UNITS) ? i18n._('mm') : i18n._('in');
        const degreeUnits = i18n._('deg');
        const wcs = actions.getWorkCoordinateSystem();
        const {
            showXPositionInput,
            showYPositionInput,
            showZPositionInput,
            showAPositionInput
        } = this.state;
        const hideXPositionInput = !showXPositionInput;
        const hideYPositionInput = !showYPositionInput;
        const hideZPositionInput = !showZPositionInput;
        const hideAPositionInput = !showAPositionInput;

        return (
            <div className={styles.displayPanel}>
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
                            <td className={styles.coordinate}>X</td>
                            <td className={styles.machinePosition}>
                                <span className={styles.integerPart}>{machinePosition.x.split('.')[0]}</span>
                                <span className={styles.decimalPoint}>.</span>
                                <span className={styles.fractionalPart}>{machinePosition.x.split('.')[1]}</span>
                                <span className={styles.dimensionUnits}>{lengthUnits}</span>
                            </td>
                            <td className={styles.workPosition}>
                                <span className={styles.dimensionUnits}>{lengthUnits}</span>
                                {showXPositionInput &&
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
                                {hideXPositionInput && canClick &&
                                <Anchor
                                    style={{ color: 'inherit' }}
                                    title={i18n._('Edit')}
                                    onClick={() => {
                                        this.setState({ showXPositionInput: true });
                                    }}
                                >
                                    <span className={styles.integerPart}>{workPosition.x.split('.')[0]}</span>
                                    <span className={styles.decimalPoint}>.</span>
                                    <span className={styles.fractionalPart}>{workPosition.x.split('.')[1]}</span>
                                </Anchor>
                                }
                                {hideXPositionInput && !canClick &&
                                <div>
                                    <span className={styles.integerPart}>{workPosition.x.split('.')[0]}</span>
                                    <span className={styles.decimalPoint}>.</span>
                                    <span className={styles.fractionalPart}>{workPosition.x.split('.')[1]}</span>
                                </div>
                                }
                            </td>
                            <td className={styles.action}>
                                <DropdownButton
                                    bsSize="xs"
                                    bsStyle="default"
                                    title="X"
                                    id="axis-x-dropdown"
                                    pullRight
                                    disabled={!canClick}
                                >
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
                                    <MenuItem divider />
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
                                </DropdownButton>
                            </td>
                        </tr>
                        }
                        {includes(axes, 'y') &&
                        <tr>
                            <td className={styles.coordinate}>Y</td>
                            <td className={styles.machinePosition}>
                                <span className={styles.integerPart}>{machinePosition.y.split('.')[0]}</span>
                                <span className={styles.decimalPoint}>.</span>
                                <span className={styles.fractionalPart}>{machinePosition.y.split('.')[1]}</span>
                                <span className={styles.dimensionUnits}>{lengthUnits}</span>
                            </td>
                            <td className={styles.workPosition}>
                                <span className={styles.dimensionUnits}>{lengthUnits}</span>
                                {showYPositionInput &&
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
                                {hideYPositionInput && canClick &&
                                <Anchor
                                    style={{ color: 'inherit' }}
                                    title={i18n._('Edit')}
                                    onClick={() => {
                                        this.setState({ showYPositionInput: true });
                                    }}
                                >
                                    <span className={styles.integerPart}>{workPosition.y.split('.')[0]}</span>
                                    <span className={styles.decimalPoint}>.</span>
                                    <span className={styles.fractionalPart}>{workPosition.y.split('.')[1]}</span>
                                </Anchor>
                                }
                                {hideYPositionInput && !canClick &&
                                <div>
                                    <span className={styles.integerPart}>{workPosition.y.split('.')[0]}</span>
                                    <span className={styles.decimalPoint}>.</span>
                                    <span className={styles.fractionalPart}>{workPosition.y.split('.')[1]}</span>
                                </div>
                                }
                            </td>
                            <td className={styles.action}>
                                <DropdownButton
                                    bsSize="xs"
                                    bsStyle="default"
                                    title="Y"
                                    id="axis-y-dropdown"
                                    pullRight
                                    disabled={!canClick}
                                >
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
                                    <MenuItem divider />
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
                                </DropdownButton>
                            </td>
                        </tr>
                        }
                        {includes(axes, 'z') &&
                        <tr>
                            <td className={styles.coordinate}>Z</td>
                            <td className={styles.machinePosition}>
                                <span className={styles.integerPart}>{machinePosition.z.split('.')[0]}</span>
                                <span className={styles.decimalPoint}>.</span>
                                <span className={styles.fractionalPart}>{machinePosition.z.split('.')[1]}</span>
                                <span className={styles.dimensionUnits}>{lengthUnits}</span>
                            </td>
                            <td className={styles.workPosition}>
                                <span className={styles.dimensionUnits}>{lengthUnits}</span>
                                {showZPositionInput &&
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
                                {hideZPositionInput && canClick &&
                                <Anchor
                                    style={{ color: 'inherit' }}
                                    title={i18n._('Edit')}
                                    onClick={() => {
                                        if (canClick) {
                                            this.setState({ showZPositionInput: true });
                                        }
                                    }}
                                >
                                    <span className={styles.integerPart}>{workPosition.z.split('.')[0]}</span>
                                    <span className={styles.decimalPoint}>.</span>
                                    <span className={styles.fractionalPart}>{workPosition.z.split('.')[1]}</span>
                                </Anchor>
                                }
                                {hideZPositionInput && !canClick &&
                                <div>
                                    <span className={styles.integerPart}>{workPosition.z.split('.')[0]}</span>
                                    <span className={styles.decimalPoint}>.</span>
                                    <span className={styles.fractionalPart}>{workPosition.z.split('.')[1]}</span>
                                </div>
                                }
                            </td>
                            <td className={styles.action}>
                                <DropdownButton
                                    bsSize="xs"
                                    bsStyle="default"
                                    title="Z"
                                    id="axis-z-dropdown"
                                    pullRight
                                    disabled={!canClick}
                                >
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
                                    <MenuItem divider />
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
                                </DropdownButton>
                            </td>
                        </tr>
                        }
                        {includes(axes, 'a') &&
                        <tr>
                            <td className={classNames(styles.coordinate, styles.top)}>
                                <div>A</div>
                                <Anchor
                                    className={styles.moveBackward}
                                    onClick={() => {
                                        const distance = actions.getJogDistance();
                                        actions.jog({ A: -distance });
                                    }}
                                >
                                    <i className="fa fa-fw fa-minus" />
                                </Anchor>
                                <Anchor
                                    className={styles.moveForward}
                                    onClick={() => {
                                        const distance = actions.getJogDistance();
                                        actions.jog({ A: distance });
                                    }}
                                >
                                    <i className="fa fa-fw fa-plus" />
                                </Anchor>
                            </td>
                            <td className={styles.machinePosition}>
                                <span className={styles.integerPart}>{machinePosition.a.split('.')[0]}</span>
                                <span className={styles.decimalPoint}>.</span>
                                <span className={styles.fractionalPart}>{machinePosition.a.split('.')[1]}</span>
                                <span className={styles.dimensionUnits}>{degreeUnits}</span>
                            </td>
                            <td className={styles.workPosition}>
                                <span className={styles.dimensionUnits}>{degreeUnits}</span>
                                {showAPositionInput &&
                                <PositionInput
                                    onOK={(value) => {
                                        // units of degree
                                        controller.command('gcode', 'G10 L20 P1 A' + value);
                                        this.setState({ showAPositionInput: false });
                                    }}
                                    onCancel={() => {
                                        this.setState({ showAPositionInput: false });
                                    }}
                                />
                                }
                                {hideAPositionInput && canClick &&
                                <Anchor
                                    style={{ color: 'inherit' }}
                                    title={i18n._('Edit')}
                                    onClick={() => {
                                        if (canClick) {
                                            this.setState({ showAPositionInput: true });
                                        }
                                    }}
                                >
                                    <span className={styles.integerPart}>{workPosition.a.split('.')[0]}</span>
                                    <span className={styles.decimalPoint}>.</span>
                                    <span className={styles.fractionalPart}>{workPosition.a.split('.')[1]}</span>
                                </Anchor>
                                }
                                {hideAPositionInput && !canClick &&
                                <div>
                                    <span className={styles.integerPart}>{workPosition.a.split('.')[0]}</span>
                                    <span className={styles.decimalPoint}>.</span>
                                    <span className={styles.fractionalPart}>{workPosition.a.split('.')[1]}</span>
                                </div>
                                }
                            </td>
                            <td className={styles.action}>
                                <DropdownButton
                                    bsSize="xs"
                                    bsStyle="default"
                                    title="A"
                                    id="axis-a-dropdown"
                                    pullRight
                                    disabled={!canClick}
                                >
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
                                    <MenuItem divider />
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
