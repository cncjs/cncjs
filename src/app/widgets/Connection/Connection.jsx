import find from 'lodash/find';
import includes from 'lodash/includes';
import map from 'lodash/map';
import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Select from 'react-select';
import Space from 'app/components/Space';
import { ToastNotification } from 'app/components/Notifications';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import {
    GRBL,
    MARLIN,
    SMOOTHIE,
    TINYG
} from '../../constants';

class Connection extends PureComponent {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    isPortOpen(path) {
        const port = find(this.props.state.ports, { comName: path }) || {};
        return !!(port.isOpen);
    }
    renderPortOption = (option) => {
        const { label, isOpen, manufacturer } = option;
        const styles = {
            option: {
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden'
            }
        };

        return (
            <div style={styles.option} title={label}>
                <div>
                    {isOpen &&
                    <span>
                        <i className="fa fa-lock" />
                        <Space width="8" />
                    </span>
                    }
                    {label}
                </div>
                {manufacturer &&
                <i>{i18n._('Manufacturer: {{manufacturer}}', { manufacturer })}</i>
                }
            </div>
        );
    };
    renderPortValue = (option) => {
        const { state } = this.props;
        const { label, isOpen } = option;
        const notLoading = !(state.loading);
        const canChangePort = notLoading;
        const style = {
            color: canChangePort ? '#333' : '#ccc',
            textOverflow: 'ellipsis',
            overflow: 'hidden'
        };
        return (
            <div style={style} title={label}>
                {isOpen &&
                <span>
                    <i className="fa fa-lock" />
                    <Space width="8" />
                </span>
                }
                {label}
            </div>
        );
    };
    renderBaudRateValue = (option) => {
        const { state } = this.props;
        const { connection, loading, connected } = state;
        const notLoading = !loading;
        const notConnected = !connected;
        const canChangeBaudRate = notLoading && notConnected && !this.isPortOpen(connection.serial.path);

        const style = {
            color: canChangeBaudRate ? '#333' : '#ccc',
            textOverflow: 'ellipsis',
            overflow: 'hidden'
        };
        return (
            <div style={style} title={option.label}>{option.label}</div>
        );
    };
    render() {
        const { state, actions } = this.props;
        const {
            connection,
            loading, connecting, connected,
            ports, baudRates,
            autoReconnect,
            alertMessage
        } = state;
        const enableHardwareFlowControl = !!connection.serial.rtscts;
        const controllerType = state.controller.type;
        const canSelectControllers = (controller.availableControllers.length > 1);
        const hasGrblController = includes(controller.availableControllers, GRBL);
        const hasMarlinController = includes(controller.availableControllers, MARLIN);
        const hasSmoothieController = includes(controller.availableControllers, SMOOTHIE);
        const hasTinyGController = includes(controller.availableControllers, TINYG);
        const notLoading = !loading;
        const notConnecting = !connecting;
        const notConnected = !connected;
        const canRefresh = notLoading && notConnected;
        const canChangeController = notLoading && notConnected;
        const canChangePort = notLoading && notConnected;
        const canChangeBaudRate = notLoading && notConnected && !this.isPortOpen(connection.serial.path);
        const canToggleHardwareFlowControl = notConnected;
        const canOpenPort = notConnecting && notConnected && connection.serial.path && connection.serial.baudRate;
        const canClosePort = connected;

        return (
            <div>
                {alertMessage &&
                <ToastNotification
                    style={{ margin: '-10px -10px 10px -10px' }}
                    type="error"
                    onDismiss={actions.clearAlert}
                >
                    {alertMessage}
                </ToastNotification>
                }
                {canSelectControllers &&
                <div className="form-group">
                    <div className="input-group input-group-sm">
                        <div className="input-group-btn">
                            {hasGrblController &&
                            <button
                                type="button"
                                className={cx(
                                    'btn',
                                    'btn-default',
                                    { 'btn-select': controllerType === GRBL }
                                )}
                                disabled={!canChangeController}
                                onClick={() => {
                                    actions.changeController(GRBL);
                                }}
                            >
                                {GRBL}
                            </button>
                            }
                            {hasMarlinController &&
                            <button
                                type="button"
                                className={cx(
                                    'btn',
                                    'btn-default',
                                    { 'btn-select': controllerType === MARLIN }
                                )}
                                disabled={!canChangeController}
                                onClick={() => {
                                    actions.changeController(MARLIN);
                                }}
                            >
                                {MARLIN}
                            </button>
                            }
                            {hasSmoothieController &&
                            <button
                                type="button"
                                className={cx(
                                    'btn',
                                    'btn-default',
                                    { 'btn-select': controllerType === SMOOTHIE }
                                )}
                                disabled={!canChangeController}
                                onClick={() => {
                                    actions.changeController(SMOOTHIE);
                                }}
                            >
                                {SMOOTHIE}
                            </button>
                            }
                            {hasTinyGController &&
                            <button
                                type="button"
                                className={cx(
                                    'btn',
                                    'btn-default',
                                    { 'btn-select': controllerType === TINYG }
                                )}
                                disabled={!canChangeController}
                                onClick={() => {
                                    actions.changeController(TINYG);
                                }}
                            >
                                {TINYG}
                            </button>
                            }
                        </div>
                    </div>
                </div>
                }
                <div className="form-group">
                    <label className="control-label">{i18n._('Port')}</label>
                    <div className="input-group input-group-sm">
                        <Select
                            backspaceRemoves={false}
                            className="sm"
                            clearable={false}
                            disabled={!canChangePort}
                            name="port"
                            noResultsText={i18n._('No ports available')}
                            onChange={actions.onChangePortOption}
                            optionRenderer={this.renderPortOption}
                            options={map(ports, (port) => ({
                                value: port.comName,
                                label: port.comName,
                                manufacturer: port.manufacturer,
                                isOpen: port.isOpen
                            }))}
                            placeholder={i18n._('Choose a port')}
                            searchable={false}
                            value={connection.serial.path}
                            valueRenderer={this.renderPortValue}
                        />
                        <div className="input-group-btn">
                            <button
                                type="button"
                                className="btn btn-default"
                                name="btn-refresh"
                                title={i18n._('Refresh')}
                                onClick={actions.handleRefresh}
                                disabled={!canRefresh}
                            >
                                <i
                                    className={cx(
                                        'fa',
                                        'fa-refresh',
                                        { 'fa-spin': loading }
                                    )}
                                />
                            </button>
                        </div>
                    </div>
                </div>
                <div className="form-group">
                    <label className="control-label">{i18n._('Baud rate')}</label>
                    <Select
                        backspaceRemoves={false}
                        className="sm"
                        clearable={false}
                        disabled={!canChangeBaudRate}
                        menuContainerStyle={{ zIndex: 5 }}
                        name="baudRate"
                        onChange={actions.onChangeBaudRateOption}
                        options={map(baudRates, (value) => ({
                            value: value,
                            label: Number(value).toString()
                        }))}
                        placeholder={i18n._('Choose a baud rate')}
                        searchable={false}
                        value={connection.serial.baudRate}
                        valueRenderer={this.renderBaudRateValue}
                    />
                </div>
                <div
                    className={cx('checkbox', {
                        'disabled': !canToggleHardwareFlowControl
                    })}
                >
                    <label>
                        <input
                            type="checkbox"
                            defaultChecked={enableHardwareFlowControl}
                            disabled={!canToggleHardwareFlowControl}
                            onChange={actions.toggleHardwareFlowControl}
                        />
                        {i18n._('Enable hardware flow control')}
                    </label>
                </div>
                <div className="checkbox">
                    <label>
                        <input
                            type="checkbox"
                            defaultChecked={autoReconnect}
                            onChange={actions.toggleAutoReconnect}
                        />
                        {i18n._('Connect automatically')}
                    </label>
                </div>
                <div className="btn-group btn-group-sm">
                    {notConnected &&
                        <button
                            type="button"
                            className="btn btn-primary"
                            disabled={!canOpenPort}
                            onClick={actions.handleOpenPort}
                        >
                            <i className="fa fa-toggle-off" />
                            <Space width="8" />
                            {i18n._('Open')}
                        </button>
                    }
                    {connected &&
                        <button
                            type="button"
                            className="btn btn-danger"
                            disabled={!canClosePort}
                            onClick={actions.handleClosePort}
                        >
                            <i className="fa fa-toggle-on" />
                            <Space width="8" />
                            {i18n._('Close')}
                        </button>
                    }
                </div>
            </div>
        );
    }
}

export default Connection;
