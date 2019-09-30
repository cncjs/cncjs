import ensureArray from 'ensure-array';
import _find from 'lodash/find';
import _includes from 'lodash/includes';
import _get from 'lodash/get';
import PropTypes from 'prop-types';
import React, { Fragment, Component } from 'react';
import { connect } from 'react-redux';
import Select from 'react-select';
import { Button, ButtonGroup } from 'app/components/Buttons';
import { Checkbox } from 'app/components/Checkbox';
import Clickable from 'app/components/Clickable';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import FormGroup from 'app/components/FormGroup';
import { Container, Row, Col } from 'app/components/GridSystem';
import Label from 'app/components/Label';
import Margin from 'app/components/Margin';
import { ToastNotification } from 'app/components/Notifications';
import Space from 'app/components/Space';
import {
    CONNECTION_TYPE_SERIAL,
    CONNECTION_TYPE_SOCKET,
    CONNECTION_STATE_CONNECTING,
    CONNECTION_STATE_CONNECTED,
} from 'app/constants/connection';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import {
    GRBL,
    MARLIN,
    SMOOTHIE,
    TINYG,
} from 'app/constants';

class Connection extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    isPortOpen = (path) => {
        const port = _find(this.props.state.ports, { comName: path }) || {};
        return !!(port.isOpen);
    };

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
                    {isOpen && (
                        <Fragment>
                            <FontAwesomeIcon icon="lock" />
                            <Space width={8} />
                        </Fragment>
                    )}
                    {label}
                </div>
                {manufacturer && (
                    <i>{i18n._('Manufacturer: {{manufacturer}}', { manufacturer })}</i>
                )}
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
                {isOpen && (
                    <Fragment>
                        <FontAwesomeIcon icon="lock" />
                        <Space width={8} />
                    </Fragment>
                )}
                {label}
            </div>
        );
    };

    renderBaudRateValue = (option) => {
        const { state } = this.props;
        const { connection, loading, connected } = state;
        const notLoading = !loading;
        const notConnected = !connected;
        const canChangeBaudRate = notLoading && notConnected && !this.isPortOpen(connection.serial.path); // FIXME
        const style = {
            color: canChangeBaudRate ? '#333' : '#ccc',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
        };

        return (
            <div style={style} title={option.label}>{option.label}</div>
        );
    };

    render() {
        const {
            connectionError,
            connectionType,
            connectionState,
            connectionOptions,
        } = this.props;
        const alertMessage = (() => {
            // serial
            if (connectionError && connectionType === CONNECTION_TYPE_SERIAL) {
                const path = _get(connectionOptions, 'path');
                return i18n._('Error opening serial port: {{-path}}', { path });
            }

            // socket
            if (connectionError && connectionType === CONNECTION_TYPE_SOCKET) {
                const host = _get(connectionOptions, 'host');
                const port = _get(connectionOptions, 'port');
                return i18n._('Error opening socket connection: {{host}}:{{port}}', { host, port });
            }

            return null;
        })();
        const { state, actions } = this.props;
        const {
            connection,
            loading,
            ports, baudRates,
            autoReconnect,
        } = state;
        const connected = connectionState === CONNECTION_STATE_CONNECTED;
        const connecting = connectionState === CONNECTION_STATE_CONNECTING;
        const enableHardwareFlowControl = _get(connection, 'serial.rtscts', false);
        const controllerType = _get(state, 'controller.type');
        const canSelectControllers = (controller.availableControllers.length > 1);
        const hasGrblController = _includes(controller.availableControllers, GRBL);
        const hasMarlinController = _includes(controller.availableControllers, MARLIN);
        const hasSmoothieController = _includes(controller.availableControllers, SMOOTHIE);
        const hasTinyGController = _includes(controller.availableControllers, TINYG);
        const notLoading = !loading;
        const notConnecting = !connecting;
        const notConnected = !connected;
        const canRefresh = notLoading && notConnected;
        const canChangeController = notLoading && notConnected;
        const canChangePort = notLoading && notConnected;
        const canChangeBaudRate = notLoading && notConnected && !this.isPortOpen(connection.serial.path); // FIXME
        const canToggleHardwareFlowControl = notConnected;
        const canOpenPort = notConnecting && notConnected && connection.serial.path && connection.serial.baudRate; // FIXME
        const canClosePort = connected;

        return (
            <Container>
                {connectionError && (
                    <ToastNotification
                        style={{ margin: '-10px -10px 10px -10px' }}
                        type="error"
                        onDismiss={actions.clearAlert}
                    >
                        {alertMessage}
                    </ToastNotification>
                )}
                {canSelectControllers && (
                    <FormGroup>
                        <ButtonGroup
                            btnSize="sm"
                            style={{
                                width: '100%',
                            }}
                        >
                            {hasGrblController && (
                                <Button
                                    btnStyle={controllerType === GRBL ? 'dark' : 'default'}
                                    disabled={!canChangeController}
                                    onClick={() => {
                                        actions.changeController(GRBL);
                                    }}
                                >
                                    {GRBL}
                                </Button>
                            )}
                            {hasMarlinController && (
                                <Button
                                    btnStyle={controllerType === MARLIN ? 'dark' : 'default'}
                                    disabled={!canChangeController}
                                    onClick={() => {
                                        actions.changeController(MARLIN);
                                    }}
                                >
                                    {MARLIN}
                                </Button>
                            )}
                            {hasSmoothieController && (
                                <Button
                                    btnStyle={controllerType === SMOOTHIE ? 'dark' : 'default'}
                                    disabled={!canChangeController}
                                    onClick={() => {
                                        actions.changeController(SMOOTHIE);
                                    }}
                                >
                                    {SMOOTHIE}
                                </Button>
                            )}
                            {hasTinyGController && (
                                <Button
                                    btnStyle={controllerType === TINYG ? 'dark' : 'default'}
                                    disabled={!canChangeController}
                                    onClick={() => {
                                        actions.changeController(TINYG);
                                    }}
                                >
                                    {TINYG}
                                </Button>
                            )}
                        </ButtonGroup>
                    </FormGroup>
                )}
                <FormGroup>
                    <Label>{i18n._('Port')}</Label>
                    <Row style={{ alignItems: 'center' }}>
                        <Col>
                            <Select
                                defaultValue={connection.serial.path}
                                isClearable={false}
                                isDisabled={!canChangePort}
                                isSearchable={false}
                                name="port"
                                noOptionsMessage={() => i18n._('No ports available')}
                                onChange={actions.onChangePortOption}
                                options={ensureArray(ports).map(port => ({
                                    value: port.comName,
                                    label: port.comName,
                                    manufacturer: port.manufacturer,
                                    isOpen: port.isOpen,
                                }))}
                                placeholder={i18n._('Choose a port')}
                            />
                        </Col>
                        <Col width="auto" style={{ width: 30 }}>
                            <Space width={12} />
                            <Clickable
                                title={i18n._('Refresh')}
                                onClick={actions.handleRefreshPorts}
                                disabled={!canRefresh}
                            >
                                {({ hovered }) => (
                                    <FontAwesomeIcon
                                        icon="sync"
                                        fixedWidth
                                        spin={loading}
                                        style={{
                                            color: '#222',
                                            opacity: hovered ? 1 : 0.5,
                                        }}
                                    />
                                )}
                            </Clickable>
                        </Col>
                    </Row>
                </FormGroup>
                <FormGroup>
                    <Label>{i18n._('Baud rate')}</Label>
                    <Row>
                        <Col>
                            <Select
                                defaultValue={connection.serial.baudRate}
                                isClearable={false}
                                isDisabled={!canChangeBaudRate}
                                isSearchable={false}
                                name="baudrate"
                                onChange={actions.onChangeBaudrateOption}
                                options={ensureArray(baudRates).map(value => ({
                                    value: value,
                                    label: Number(value).toString()
                                }))}
                                placeholder={i18n._('Choose a baud rate')}
                            />
                        </Col>
                        <Col width="auto" style={{ width: 30 }} />
                    </Row>
                </FormGroup>
                <FormGroup>
                    <Checkbox
                        defaultChecked={enableHardwareFlowControl}
                        onChange={actions.toggleHardwareFlowControl}
                        disabled={!canToggleHardwareFlowControl}
                    >
                        <Space width={8} />
                        {i18n._('Enable hardware flow control')}
                    </Checkbox>
                </FormGroup>
                <FormGroup>
                    <Checkbox
                        defaultChecked={autoReconnect}
                        onChange={actions.toggleAutoReconnect}
                    >
                        <Space width={8} />
                        {i18n._('Connect automatically')}
                    </Checkbox>
                </FormGroup>
                <Margin bottom={8}>
                    {notConnected && (
                        <Button
                            btnStyle="primary"
                            disabled={!canOpenPort}
                            onClick={actions.handleOpenPort}
                        >
                            <FontAwesomeIcon icon="toggle-off" />
                            <Space width={8} />
                            {i18n._('Open')}
                        </Button>
                    )}
                    {connected && (
                        <Button
                            btnStyle="danger"
                            disabled={!canClosePort}
                            onClick={actions.handleClosePort}
                        >
                            <FontAwesomeIcon icon="toggle-on" />
                            <Space width={8} />
                            {i18n._('Close')}
                        </Button>
                    )}
                </Margin>
            </Container>
        );
    }
}

export default connect(store => {
    const connectionError = _get(store, 'connection.error');
    const connectionType = _get(store, 'connection.type');
    const connectionState = _get(store, 'connection.state');
    const connectionOptions = _get(store, 'connection.options');

    return {
        connectionError,
        connectionType,
        connectionState,
        connectionOptions,
    };
})(Connection);
