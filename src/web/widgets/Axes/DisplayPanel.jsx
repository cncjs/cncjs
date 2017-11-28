import classNames from 'classnames';
import ensureArray from 'ensure-array';
import includes from 'lodash/includes';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Anchor from '../../components/Anchor';
import Dropdown, { MenuItem } from '../../components/Dropdown';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import PositionInput from './PositionInput';
import {
    METRIC_UNITS
} from '../../constants';
import styles from './index.styl';

class DisplayPanel extends PureComponent {
    static propTypes = {
        config: PropTypes.object,
        state: PropTypes.object,
        actions: PropTypes.object
    };

    state = {
        showXPositionInput: false,
        showYPositionInput: false,
        showZPositionInput: false,
        showAPositionInput: false
    };

    handleSelect = (eventKey) => {
        const commands = ensureArray(eventKey);
        commands.forEach(command => controller.command('gcode', command));
    };

    render() {
        const { state, actions } = this.props;
        const { units, canClick, axes, machinePosition, workPosition } = state;
        const lengthUnits = (units === METRIC_UNITS) ? i18n._('mm') : i18n._('in');
        const degreeUnits = i18n._('deg');
        const { wcs } = controller.getModalState();
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
                            <th className={classNames('nowrap', styles.action)}>
                                <Dropdown
                                    id="axes-dropdown"
                                    pullRight
                                    disabled={!canClick}
                                    onSelect={this.handleSelect}
                                >
                                    <Dropdown.Toggle
                                        className={styles.actionDropdown}
                                        btnStyle="link"
                                        compact
                                        noCaret
                                    >
                                        <i className="fa fa-fw fa-caret-down" />
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu>
                                        <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
                                        <MenuItem
                                            eventKey="G92 X0 Y0 Z0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Temporary Offsets (G92 X0 Y0 Z0)')}
                                        </MenuItem>
                                        <MenuItem
                                            eventKey="G92.1 X0 Y0 Z0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Un-Zero Out Temporary Offsets (G92.1 X0 Y0 Z0)')}
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
                                            eventKey="G0 X0 Y0 Z0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Go To Work Zero (G0 X0 Y0 Z0)')}
                                        </MenuItem>
                                        {wcs === 'G54' &&
                                        <MenuItem
                                            eventKey="G10 L20 P1 X0 Y0 Z0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work Offsets (G10 L20 P1 X0 Y0 Z0)')}
                                        </MenuItem>
                                        }
                                        {wcs === 'G55' &&
                                        <MenuItem
                                            eventKey="G10 L20 P2 X0 Y0 Z0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work Offsets (G10 L20 P2 X0 Y0 Z0)')}
                                        </MenuItem>
                                        }
                                        {wcs === 'G56' &&
                                        <MenuItem
                                            eventKey="G10 L20 P3 X0 Y0 Z0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work Offsets (G10 L20 P3 X0 Y0 Z0)')}
                                        </MenuItem>
                                        }
                                        {wcs === 'G57' &&
                                        <MenuItem
                                            eventKey="G10 L20 P4 X0 Y0 Z0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work Offsets (G10 L20 P4 X0 Y0 Z0)')}
                                        </MenuItem>
                                        }
                                        {wcs === 'G58' &&
                                        <MenuItem
                                            eventKey="G10 L20 P5 X0 Y0 Z0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work Offsets (G10 L20 P5 X0 Y0 Z0)')}
                                        </MenuItem>
                                        }
                                        {wcs === 'G59' &&
                                        <MenuItem
                                            eventKey="G10 L20 P6 X0 Y0 Z0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work Offsets (G10 L20 P6 X0 Y0 Z0)')}
                                        </MenuItem>
                                        }
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
                                        <MenuItem
                                            eventKey="G53 G0 X0 Y0 Z0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Go To Machine Zero (G53 G0 X0 Y0 Z0)')}
                                        </MenuItem>
                                        <MenuItem
                                            eventKey="G28.3 X0 Y0 Z0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Set Machine Zero (G28.3 X0 Y0 Z0)')}
                                        </MenuItem>
                                        <MenuItem
                                            eventKey="G28.2 X0 Y0 Z0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Homing Sequence (G28.2 X0 Y0 Z0)')}
                                        </MenuItem>
                                    </Dropdown.Menu>
                                </Dropdown>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {(machinePosition.e !== undefined && workPosition.e !== undefined) &&
                        <tr>
                            <td className={styles.coordinate}>E</td>
                            <td className={styles.machinePosition}>
                                <span className={styles.integerPart}>{machinePosition.e.split('.')[0]}</span>
                                <span className={styles.decimalPoint}>.</span>
                                <span className={styles.fractionalPart}>{machinePosition.e.split('.')[1]}</span>
                                <span className={styles.dimensionUnits}>{lengthUnits}</span>
                            </td>
                            <td className={styles.workPosition}>
                                <span className={styles.integerPart}>{workPosition.e.split('.')[0]}</span>
                                <span className={styles.decimalPoint}>.</span>
                                <span className={styles.fractionalPart}>{workPosition.e.split('.')[1]}</span>
                                <span className={styles.dimensionUnits}>{lengthUnits}</span>
                            </td>
                            <td className={styles.action} />
                        </tr>
                        }
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
                                        actions.setWorkOffsets('x', value);
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
                                <Dropdown
                                    id="axis-x-dropdown"
                                    pullRight
                                    disabled={!canClick}
                                    onSelect={this.handleSelect}
                                >
                                    <Dropdown.Toggle
                                        className={styles.actionDropdown}
                                        style={{ lineHeight: '32px' }}
                                        btnStyle="link"
                                        compact
                                        noCaret
                                    >
                                        <i className="fa fa-fw fa-ellipsis-v" />
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu>
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
                                            disabled={!canClick}
                                        >
                                            {i18n._('Go To Work Zero On X Axis (G0 X0)')}
                                        </MenuItem>
                                        {wcs === 'G54' &&
                                        <MenuItem
                                            eventKey="G10 L20 P1 X0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work X Axis (G10 L20 P1 X0)')}
                                        </MenuItem>
                                        }
                                        {wcs === 'G55' &&
                                        <MenuItem
                                            eventKey="G10 L20 P2 X0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work X Axis (G10 L20 P2 X0)')}
                                        </MenuItem>
                                        }
                                        {wcs === 'G56' &&
                                        <MenuItem
                                            eventKey="G10 L20 P3 X0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work X Axis (G10 L20 P3 X0)')}
                                        </MenuItem>
                                        }
                                        {wcs === 'G57' &&
                                        <MenuItem
                                            eventKey="G10 L20 P4 X0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work X Axis (G10 L20 P4 X0)')}
                                        </MenuItem>
                                        }
                                        {wcs === 'G58' &&
                                        <MenuItem
                                            eventKey="G10 L20 P5 X0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work X Axis (G10 L20 P5 X0)')}
                                        </MenuItem>
                                        }
                                        {wcs === 'G59' &&
                                        <MenuItem
                                            eventKey="G10 L20 P6 X0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work X Axis (G10 L20 P6 X0)')}
                                        </MenuItem>
                                        }
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
                                        <MenuItem
                                            eventKey="G53 G0 X0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Go To Machine Zero On X Axis (G53 G0 X0)')}
                                        </MenuItem>
                                        <MenuItem
                                            eventKey="G28.3 X0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Machine X Axis (G28.3 X0)')}
                                        </MenuItem>
                                        <MenuItem
                                            eventKey="G28.2 X0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Home Machine X Axis (G28.2 X0)')}
                                        </MenuItem>
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
                                        <MenuItem
                                            eventKey="G92 X0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Temporary X Axis (G92 X0)')}
                                        </MenuItem>
                                        <MenuItem
                                            eventKey="G92.1 X0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Un-Zero Out Temporary X Axis (G92.1 X0)')}
                                        </MenuItem>
                                    </Dropdown.Menu>
                                </Dropdown>
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
                                        actions.setWorkOffsets('y', value);
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
                                <Dropdown
                                    id="axis-y-dropdown"
                                    pullRight
                                    disabled={!canClick}
                                    onSelect={this.handleSelect}
                                >
                                    <Dropdown.Toggle
                                        className={styles.actionDropdown}
                                        style={{ lineHeight: '32px' }}
                                        btnStyle="link"
                                        compact
                                        noCaret
                                    >
                                        <i className="fa fa-fw fa-ellipsis-v" />
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu>
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
                                            disabled={!canClick}
                                        >
                                            {i18n._('Go To Work Zero On Y Axis (G0 Y0)')}
                                        </MenuItem>
                                        {wcs === 'G54' &&
                                        <MenuItem
                                            eventKey="G10 L20 P1 Y0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work Y Axis (G10 L20 P1 Y0)')}
                                        </MenuItem>
                                        }
                                        {wcs === 'G55' &&
                                        <MenuItem
                                            eventKey="G10 L20 P2 Y0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work Y Axis (G10 L20 P2 Y0)')}
                                        </MenuItem>
                                        }
                                        {wcs === 'G56' &&
                                        <MenuItem
                                            eventKey="G10 L20 P3 Y0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work Y Axis (G10 L20 P3 Y0)')}
                                        </MenuItem>
                                        }
                                        {wcs === 'G57' &&
                                        <MenuItem
                                            eventKey="G10 L20 P4 Y0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work Y Axis (G10 L20 P4 Y0)')}
                                        </MenuItem>
                                        }
                                        {wcs === 'G58' &&
                                        <MenuItem
                                            eventKey="G10 L20 P5 Y0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work Y Axis (G10 L20 P5 Y0)')}
                                        </MenuItem>
                                        }
                                        {wcs === 'G59' &&
                                        <MenuItem
                                            eventKey="G10 L20 P6 Y0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work Y Axis (G10 L20 P6 Y0)')}
                                        </MenuItem>
                                        }
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
                                        <MenuItem
                                            eventKey="G53 G0 Y0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Go To Machine Zero On Y Axis (G53 G0 Y0)')}
                                        </MenuItem>
                                        <MenuItem
                                            eventKey="G28.3 Y0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Machine Y Axis (G28.3 Y0)')}
                                        </MenuItem>
                                        <MenuItem
                                            eventKey="G28.2 Y0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Home Machine Y Axis (G28.2 Y0)')}
                                        </MenuItem>
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
                                        <MenuItem
                                            eventKey="G92 Y0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Temporary Y Axis (G92 Y0)')}
                                        </MenuItem>
                                        <MenuItem
                                            eventKey="G92.1 Y0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Un-Zero Out Temporary Y Axis (G92.1 Y0)')}
                                        </MenuItem>
                                    </Dropdown.Menu>
                                </Dropdown>
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
                                        actions.setWorkOffsets('z', value);
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
                                <Dropdown
                                    id="axis-z-dropdown"
                                    pullRight
                                    disabled={!canClick}
                                    onSelect={this.handleSelect}
                                >
                                    <Dropdown.Toggle
                                        className={styles.actionDropdown}
                                        style={{ lineHeight: '32px' }}
                                        btnStyle="link"
                                        compact
                                        noCaret
                                    >
                                        <i className="fa fa-fw fa-ellipsis-v" />
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu>
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
                                            disabled={!canClick}
                                        >
                                            {i18n._('Go To Work Zero On Z Axis (G0 Z0)')}
                                        </MenuItem>
                                        {wcs === 'G54' &&
                                        <MenuItem
                                            eventKey="G10 L20 P1 Z0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work Z Axis (G10 L20 P1 Z0)')}
                                        </MenuItem>
                                        }
                                        {wcs === 'G55' &&
                                        <MenuItem
                                            eventKey="G10 L20 P2 Z0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work Z Axis (G10 L20 P2 Z0)')}
                                        </MenuItem>
                                        }
                                        {wcs === 'G56' &&
                                        <MenuItem
                                            eventKey="G10 L20 P3 Z0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work Z Axis (G10 L20 P3 Z0)')}
                                        </MenuItem>
                                        }
                                        {wcs === 'G57' &&
                                        <MenuItem
                                            eventKey="G10 L20 P4 Z0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work Z Axis (G10 L20 P4 Z0)')}
                                        </MenuItem>
                                        }
                                        {wcs === 'G58' &&
                                        <MenuItem
                                            eventKey="G10 L20 P5 Z0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work Z Axis (G10 L20 P5 Z0)')}
                                        </MenuItem>
                                        }
                                        {wcs === 'G59' &&
                                        <MenuItem
                                            eventKey="G10 L20 P6 Z0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work Z Axis (G10 L20 P6 Z0)')}
                                        </MenuItem>
                                        }
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
                                        <MenuItem
                                            eventKey="G53 G0 Z0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Go To Machine Zero On Z Axis (G53 G0 Z0)')}
                                        </MenuItem>
                                        <MenuItem
                                            eventKey="G28.3 Z0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Machine Z Axis (G28.3 Z0)')}
                                        </MenuItem>
                                        <MenuItem
                                            eventKey="G28.2 Z0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Home Machine Z Axis (G28.2 Z0)')}
                                        </MenuItem>
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
                                        <MenuItem
                                            eventKey="G92 Z0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Temporary Z Axis (G92 Z0)')}
                                        </MenuItem>
                                        <MenuItem
                                            eventKey="G92.1 Z0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Un-Zero Out Temporary Z Axis (G92.1 Z0)')}
                                        </MenuItem>
                                    </Dropdown.Menu>
                                </Dropdown>
                            </td>
                        </tr>
                        }
                        {includes(axes, 'a') &&
                        <tr>
                            <td className={styles.coordinate}>A</td>
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
                                        actions.setWorkOffsets('a', value);
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
                                <Dropdown
                                    id="axis-a-dropdown"
                                    pullRight
                                    disabled={!canClick}
                                    onSelect={this.handleSelect}
                                >
                                    <Dropdown.Toggle
                                        className={styles.actionDropdown}
                                        style={{ lineHeight: '32px' }}
                                        btnStyle="link"
                                        compact
                                        noCaret
                                    >
                                        <i className="fa fa-fw fa-ellipsis-v" />
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu>
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
                                            disabled={!canClick}
                                        >
                                            {i18n._('Go To Work Zero On A Axis (G0 A0)')}
                                        </MenuItem>
                                        {wcs === 'G54' &&
                                        <MenuItem
                                            eventKey="G10 L20 P1 A0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work A Axis (G10 L20 P1 A0)')}
                                        </MenuItem>
                                        }
                                        {wcs === 'G55' &&
                                        <MenuItem
                                            eventKey="G10 L20 P2 A0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work A Axis (G10 L20 P2 A0)')}
                                        </MenuItem>
                                        }
                                        {wcs === 'G56' &&
                                        <MenuItem
                                            eventKey="G10 L20 P3 A0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work A Axis (G10 L20 P3 A0)')}
                                        </MenuItem>
                                        }
                                        {wcs === 'G57' &&
                                        <MenuItem
                                            eventKey="G10 L20 P4 A0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work A Axis (G10 L20 P4 A0)')}
                                        </MenuItem>
                                        }
                                        {wcs === 'G58' &&
                                        <MenuItem
                                            eventKey="G10 L20 P5 A0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work A Axis (G10 L20 P5 A0)')}
                                        </MenuItem>
                                        }
                                        {wcs === 'G59' &&
                                        <MenuItem
                                            eventKey="G10 L20 P6 A0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Work A Axis (G10 L20 P6 A0)')}
                                        </MenuItem>
                                        }
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
                                        <MenuItem
                                            eventKey="G53 G0 A0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Go To Machine Zero On A Axis (G53 G0 A0)')}
                                        </MenuItem>
                                        <MenuItem
                                            eventKey="G28.3 A0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Machine A Axis (G28.3 A0)')}
                                        </MenuItem>
                                        <MenuItem
                                            eventKey="G28.2 A0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Home Machine A Axis (G28.2 A0)')}
                                        </MenuItem>
                                        <MenuItem divider />
                                        <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
                                        <MenuItem
                                            eventKey="G92 A0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Zero Out Temporary A Axis (G92 A0)')}
                                        </MenuItem>
                                        <MenuItem
                                            eventKey="G92.1 A0"
                                            disabled={!canClick}
                                        >
                                            {i18n._('Un-Zero Out Temporary A Axis (G92.1 A0)')}
                                        </MenuItem>
                                    </Dropdown.Menu>
                                </Dropdown>
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
