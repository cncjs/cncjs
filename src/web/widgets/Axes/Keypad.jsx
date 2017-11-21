import includes from 'lodash/includes';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Button } from '../../components/Buttons';
import Dropdown, { MenuItem } from '../../components/Dropdown';
import Space from '../../components/Space';
import controller from '../../lib/controller';
import ensureArray from '../../lib/ensure-array';
import i18n from '../../lib/i18n';
import styles from './index.styl';

class Keypad extends PureComponent {
    static propTypes = {
        config: PropTypes.object,
        state: PropTypes.object,
        actions: PropTypes.object
    };

    handleSelect = (eventKey) => {
        const commands = ensureArray(eventKey);
        commands.forEach(command => controller.command('gcode', command));
    };

    render() {
        const { config, state, actions } = this.props;
        const { canClick, axes, keypadJogging, selectedAxis } = state;
        const canClickX = canClick && includes(axes, 'x');
        const canClickY = canClick && includes(axes, 'y');
        const canClickXY = canClickX && canClickY;
        const canClickZ = canClick && includes(axes, 'z');
        const canClickA = canClick && includes(axes, 'a');
        const highlightX = canClickX && (keypadJogging || selectedAxis === 'x');
        const highlightY = canClickY && (keypadJogging || selectedAxis === 'y');
        const highlightZ = canClickZ && (keypadJogging || selectedAxis === 'z');
        const highlightA = canClickA && (keypadJogging || selectedAxis === 'a');

        return (
            <div className={styles.keypad}>
                <div className={styles.rowSpace}>
                    <div className="row no-gutters">
                        <div className="col-xs-2">
                            <div className={styles.colSpace}>
                                <Button
                                    btnStyle="flat"
                                    compact
                                    className={styles.btnKeypad}
                                    onClick={() => {
                                        const distance = actions.getJogDistance();
                                        actions.jog({ X: -distance, Y: distance });
                                    }}
                                    disabled={!canClickXY}
                                    title={i18n._('Move X- Y+')}
                                >
                                    <i className={classNames('fa', 'fa-arrow-circle-up', styles['rotate--45deg'])} style={{ fontSize: 16 }} />
                                </Button>
                            </div>
                        </div>
                        <div className="col-xs-2">
                            <div className={styles.colSpace}>
                                <Button
                                    btnStyle="flat"
                                    compact
                                    className={classNames(
                                        styles.btnKeypad,
                                        { [styles.highlight]: highlightY }
                                    )}
                                    onClick={() => {
                                        const distance = actions.getJogDistance();
                                        actions.jog({ Y: distance });
                                    }}
                                    disabled={!canClickY}
                                    title={i18n._('Move Y+')}
                                >
                                    <span className={styles.keypadText}>Y</span>
                                    <span className={styles.keypadSubscript}>
                                        <i className="fa fa-fw fa-plus" />
                                    </span>
                                </Button>
                            </div>
                        </div>
                        <div className="col-xs-2">
                            <div className={styles.colSpace}>
                                <Button
                                    btnStyle="flat"
                                    compact
                                    className={styles.btnKeypad}
                                    onClick={() => {
                                        const distance = actions.getJogDistance();
                                        actions.jog({ X: distance, Y: distance });
                                    }}
                                    disabled={!canClickXY}
                                    title={i18n._('Move X+ Y+')}
                                >
                                    <i className={classNames('fa', 'fa-arrow-circle-up', styles['rotate-45deg'])} style={{ fontSize: 16 }} />
                                </Button>
                            </div>
                        </div>
                        <div className="col-xs-2">
                            <div className={styles.colSpace}>
                                <Button
                                    btnStyle="flat"
                                    compact
                                    className={classNames(
                                        styles.btnKeypad,
                                        { [styles.highlight]: highlightZ }
                                    )}
                                    onClick={() => {
                                        const distance = actions.getJogDistance();
                                        actions.jog({ Z: distance });
                                    }}
                                    disabled={!canClickZ}
                                    title={i18n._('Move Z+')}
                                >
                                    <span className={styles.keypadText}>Z</span>
                                    <span className={styles.keypadSubscript}>
                                        <i className="fa fa-fw fa-plus" />
                                    </span>
                                </Button>
                            </div>
                        </div>
                        <div className="col-xs-2">
                            <div className={styles.colSpace}>
                                <Button
                                    btnStyle="flat"
                                    compact
                                    className={classNames(
                                        styles.btnKeypad,
                                        { [styles.highlight]: highlightA }
                                    )}
                                    onClick={() => {
                                        const distance = actions.getJogDistance();
                                        actions.jog({ A: distance });
                                    }}
                                    disabled={!canClickA}
                                    title={i18n._('Move A+')}
                                >
                                    <span className={styles.keypadText}>A</span>
                                    <span className={styles.keypadSubscript}>
                                        <i className="fa fa-fw fa-plus" />
                                    </span>
                                </Button>
                            </div>
                        </div>
                        <div className="col-xs-2">
                            <div className={styles.colSpace}>
                                <Button
                                    btnStyle="flat"
                                    compact
                                    className={styles.btnKeypad}
                                    onClick={() => {
                                        const wzero = config.get('wzero');
                                        controller.command('gcode', wzero);
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Go To Work Zero')}
                                >
                                    <span className={styles.keypadText}>W</span>
                                    <span className={styles.keypadSubscript}>
                                        <i className="fa fa-fw fa-circle-o" style={{ transform: 'scaleX(.7)' }} />
                                    </span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={styles.rowSpace}>
                    <div className="row no-gutters">
                        <div className="col-xs-2">
                            <div className={styles.colSpace}>
                                <Button
                                    btnStyle="flat"
                                    compact
                                    className={classNames(
                                        styles.btnKeypad,
                                        { [styles.highlight]: highlightX }
                                    )}
                                    onClick={() => {
                                        const distance = actions.getJogDistance();
                                        actions.jog({ X: -distance });
                                    }}
                                    disabled={!canClickX}
                                    title={i18n._('Move X-')}
                                >
                                    <span className={styles.keypadText}>X</span>
                                    <span className={styles.keypadSubscript}>
                                        <i className="fa fa-fw fa-minus" />
                                    </span>
                                </Button>
                            </div>
                        </div>
                        <div className="col-xs-2">
                            <div className={styles.colSpace}>
                                <Button
                                    btnStyle="flat"
                                    compact
                                    className={styles.btnKeypad}
                                    onClick={() => actions.move({ X: 0, Y: 0 })}
                                    disabled={!canClickXY}
                                    title={i18n._('Move To XY Zero (G0 X0 Y0)')}
                                >
                                    <span className={styles.keypadText}>X/Y</span>
                                </Button>
                            </div>
                        </div>
                        <div className="col-xs-2">
                            <div className={styles.colSpace}>
                                <Button
                                    btnStyle="flat"
                                    compact
                                    className={classNames(
                                        styles.btnKeypad,
                                        { [styles.highlight]: highlightX }
                                    )}
                                    onClick={() => {
                                        const distance = actions.getJogDistance();
                                        actions.jog({ X: distance });
                                    }}
                                    disabled={!canClickX}
                                    title={i18n._('Move X+')}
                                >
                                    <span className={styles.keypadText}>X</span>
                                    <span className={styles.keypadSubscript}>+</span>
                                </Button>
                            </div>
                        </div>
                        <div className="col-xs-2">
                            <div className={styles.colSpace}>
                                <Button
                                    btnStyle="flat"
                                    compact
                                    className={styles.btnKeypad}
                                    onClick={() => actions.move({ Z: 0 })}
                                    disabled={!canClickZ}
                                    title={i18n._('Move To Z Zero (G0 Z0)')}
                                >
                                    <span className={styles.keypadText}>Z</span>
                                    <span className={styles.keypadSubscript}>
                                        <i className="fa fa-fw fa-circle-o" style={{ transform: 'scaleX(.7)' }} />
                                    </span>
                                </Button>
                            </div>
                        </div>
                        <div className="col-xs-2">
                            <div className={styles.colSpace}>
                                <Button
                                    btnStyle="flat"
                                    compact
                                    className={styles.btnKeypad}
                                    onClick={() => actions.move({ A: 0 })}
                                    disabled={!canClickA}
                                    title={i18n._('Move To A Zero (G0 A0)')}
                                >
                                    <span className={styles.keypadText}>A</span>
                                    <span className={styles.keypadSubscript}>
                                        <i className="fa fa-fw fa-circle-o" style={{ transform: 'scaleX(.7)' }} />
                                    </span>
                                </Button>
                            </div>
                        </div>
                        <div className="col-xs-2">
                            <div className={styles.colSpace}>
                                <Button
                                    btnStyle="flat"
                                    compact
                                    className={styles.btnKeypad}
                                    onClick={() => {
                                        const mzero = config.get('mzero');
                                        controller.command('gcode', mzero);
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Go To Machine Zero')}
                                >
                                    <span className={styles.keypadText}>M</span>
                                    <span className={styles.keypadSubscript}>
                                        <i className="fa fa-fw fa-circle-o" style={{ transform: 'scaleX(.7)' }} />
                                    </span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={styles.rowSpace}>
                    <div className="row no-gutters">
                        <div className="col-xs-2">
                            <div className={styles.colSpace}>
                                <Button
                                    btnStyle="flat"
                                    compact
                                    className={styles.btnKeypad}
                                    onClick={() => {
                                        const distance = actions.getJogDistance();
                                        actions.jog({ X: -distance, Y: -distance });
                                    }}
                                    disabled={!canClickXY}
                                    title={i18n._('Move X- Y-')}
                                >
                                    <i className={classNames('fa', 'fa-arrow-circle-down', styles['rotate-45deg'])} style={{ fontSize: 16 }} />
                                </Button>
                            </div>
                        </div>
                        <div className="col-xs-2">
                            <div className={styles.colSpace}>
                                <Button
                                    btnStyle="flat"
                                    compact
                                    className={classNames(
                                        styles.btnKeypad,
                                        { [styles.highlight]: highlightY }
                                    )}
                                    onClick={() => {
                                        const distance = actions.getJogDistance();
                                        actions.jog({ Y: -distance });
                                    }}
                                    disabled={!canClickY}
                                    title={i18n._('Move Y-')}
                                >
                                    <span className={styles.keypadText}>Y</span>
                                    <span className={styles.keypadSubscript}>
                                        <i className="fa fa-fw fa-minus" />
                                    </span>
                                </Button>
                            </div>
                        </div>
                        <div className="col-xs-2">
                            <div className={styles.colSpace}>
                                <Button
                                    btnStyle="flat"
                                    compact
                                    className={styles.btnKeypad}
                                    onClick={() => {
                                        const distance = actions.getJogDistance();
                                        actions.jog({ X: distance, Y: -distance });
                                    }}
                                    disabled={!canClickXY}
                                    title={i18n._('Move X+ Y-')}
                                >
                                    <i className={classNames('fa', 'fa-arrow-circle-down', styles['rotate--45deg'])} style={{ fontSize: 16 }} />
                                </Button>
                            </div>
                        </div>
                        <div className="col-xs-2">
                            <div className={styles.colSpace}>
                                <Button
                                    btnStyle="flat"
                                    compact
                                    className={classNames(
                                        styles.btnKeypad,
                                        { [styles.highlight]: highlightZ }
                                    )}
                                    onClick={() => {
                                        const distance = actions.getJogDistance();
                                        actions.jog({ Z: -distance });
                                    }}
                                    disabled={!canClickZ}
                                    title={i18n._('Move Z-')}
                                >
                                    <span className={styles.keypadText}>Z</span>
                                    <span className={styles.keypadSubscript}>
                                        <i className="fa fa-fw fa-minus" />
                                    </span>
                                </Button>
                            </div>
                        </div>
                        <div className="col-xs-2">
                            <div className={styles.colSpace}>
                                <Button
                                    btnStyle="flat"
                                    compact
                                    className={classNames(
                                        styles.btnKeypad,
                                        { [styles.highlight]: highlightA }
                                    )}
                                    onClick={() => {
                                        const distance = actions.getJogDistance();
                                        actions.jog({ A: -distance });
                                    }}
                                    disabled={!canClickA}
                                    title={i18n._('Move A-')}
                                >
                                    <span className={styles.keypadText}>A</span>
                                    <span className={styles.keypadSubscript}>
                                        <i className="fa fa-fw fa-minus" />
                                    </span>
                                </Button>
                            </div>
                        </div>
                        <div className="col-xs-2">
                            <div className={styles.colSpace}>
                                <Dropdown
                                    id="predefined-position-dropdown"
                                    style={{ width: '100%' }}
                                    pullRight
                                    dropup
                                    disabled={!canClick}
                                    onSelect={this.handleSelect}
                                >
                                    <Dropdown.Toggle
                                        className={styles.btnKeypad}
                                        btnStyle="flat"
                                        compact
                                        noCaret
                                    >
                                        <i className="fa fa-navicon" />
                                        <Space width="4" />
                                        <i className="fa fa-caret-up" />
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu>
                                        <MenuItem header>
                                            {i18n._('Predefined Position')}
                                        </MenuItem>
                                        <MenuItem eventKey="G28" disabled={!canClick}>
                                            {i18n._('Go To Predefined Position 1 (G28)')}
                                        </MenuItem>
                                        <MenuItem eventKey="G30" disabled={!canClick}>
                                            {i18n._('Go To Predefined Position 2 (G30)')}
                                        </MenuItem>
                                        <MenuItem eventKey="G28.1" disabled={!canClick}>
                                            {i18n._('Set Predefined Position 1 (G28.1)')}
                                        </MenuItem>
                                        <MenuItem eventKey="G30.1" disabled={!canClick}>
                                            {i18n._('Set Predefined Position 2 (G30.1)')}
                                        </MenuItem>
                                    </Dropdown.Menu>
                                </Dropdown>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Keypad;
