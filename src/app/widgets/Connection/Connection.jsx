import ensureArray from 'ensure-array';
import _find from 'lodash/find';
import _get from 'lodash/get';
import _includes from 'lodash/includes';
import _set from 'lodash/set';
import _uniqueId from 'lodash/uniqueId';
import React, { useCallback, useContext, useEffect, useRef } from 'react';
import { Form, Field, FormSpy } from 'react-final-form';
import { connect } from 'react-redux';
import Select from 'react-select';
import * as connectionActions from 'app/actions/connection';
import * as serialportActions from 'app/actions/serialport';
import { Button, ButtonGroup } from 'app/components/Buttons';
import { Checkbox } from 'app/components/Checkbox';
import Clickable from 'app/components/Clickable';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import Input from 'app/components/FormControl/Input';
import FormGroup from 'app/components/FormGroup';
import { Container, Row, Col } from 'app/components/GridSystem';
import Label from 'app/components/Label';
import Margin from 'app/components/Margin';
import { ToastNotification } from 'app/components/Notifications';
import Space from 'app/components/Space';
import {
    GRBL,
    MARLIN,
    SMOOTHIE,
    TINYG,
} from 'app/constants';
import {
    CONNECTION_TYPE_SERIAL,
    CONNECTION_TYPE_SOCKET,
    CONNECTION_STATE_CONNECTED,
    CONNECTION_STATE_CONNECTING,
    CONNECTION_STATE_DISCONNECTED,
    CONNECTION_STATE_DISCONNECTING,
} from 'app/constants/connection';
import useMount from 'app/hooks/useMount';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import { WidgetConfigContext } from 'app/widgets/context';

const Connection = ({
    connectionError,
    connectionType,
    connectionState,
    connectionOptions,
    isFetchingPorts,
    isFetchingBaudRates,
    ports,
    baudRates,
    openConnection,
    closeConnection,
    fetchPorts,
    fetchBaudRates,
}) => {
    const config = useContext(WidgetConfigContext);
    const isConnected = (connectionState === CONNECTION_STATE_CONNECTED);
    const isConnecting = (connectionState === CONNECTION_STATE_CONNECTING);
    const isDisconnected = (connectionState === CONNECTION_STATE_DISCONNECTED);
    const isDisconnecting = (connectionState === CONNECTION_STATE_DISCONNECTING);
    const initialValues = {
        controller: {
            type: config.get('controller.type'),
        },
        connection: {
            type: config.get('connection.type'),
            serial: {
                path: (() => {
                    const path = config.get('connection.serial.path');
                    return _find(ports, { comName: path }) ? path : null;
                })(),
                baudRate: (() => {
                    const baudRate = config.get('connection.serial.baudRate');
                    return _includes(baudRates, baudRate) ? baudRate : null;
                })(),
                rtscts: config.get('connection.serial.rtscts'),
            },
            socket: {
                host: config.get('connection.socket.host'),
                port: config.get('connection.socket.port'),
            },
        },
        autoReconnect: config.get('autoReconnect'),
    };

    const handleRefreshPorts = useCallback(() => {
        fetchPorts();
    }, []);

    const handleRefreshBaudRates = useCallback(() => {
        fetchBaudRates();
    }, []);


    { // Fetch ports and baud rates only after the initial render
        useMount(() => {
            fetchPorts();
            fetchBaudRates();
        });
    }

    { // Auto reconnect
        const autoReconnectRef = useRef(false);

        useEffect(() => {
            const autoReconnect = config.get('autoReconnect');
            const autoReconnected = autoReconnectRef.current;

            if (autoReconnect && (!autoReconnected) && ports.length > 0 && baudRates.length > 0) {
                autoReconnectRef.current = true;

                const controllerType = config.get('controller.type');
                const connectionType = config.get('connection.type');

                const options = {};
                _set(options, 'controller.type', controllerType);
                _set(options, 'connection.type', connectionType);
                _set(options, 'connection.options', ({
                    [CONNECTION_TYPE_SERIAL]: {
                        path: config.get('connection.serial.path'),
                        baudRate: config.get('connection.serial.baudRate'),
                        rtscts: config.get('connection.serial.rtscts'),
                    },
                    [CONNECTION_TYPE_SOCKET]: {
                        host: config.get('connection.socket.host'),
                        port: config.get('connection.socket.port'),
                    },
                }[connectionType]));

                openConnection(options);
            }
        });
    }

    /*
    const isPortOpen = (path) => {
        const port = _find(ports, { comName: path }) || {};
        return !!(port.isOpen);
    };

    const renderPortOption = (option) => {
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

    const renderPortValue = (option) => {
        const { state } = this.props;
        const { label, isOpen } = option;
        const canChangePort = !isFetching;
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

    const renderBaudRateValue = (option) => {
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
    */
    const canRefreshPorts = isDisconnected && !isFetchingPorts;
    const canRefreshBaudRates = isDisconnected && !isFetchingBaudRates;

    return (
        <Container>
            <ToastNotification
                key={_uniqueId()}
                show={!!connectionError}
                type="error"
                autoDismiss={5000}
                style={{ margin: '-10px -10px 10px -10px' }}
            >
                {(connectionError && connectionType === CONNECTION_TYPE_SERIAL) && (
                    i18n._('Error opening serial port: {{-path}}', {
                        path: _get(connectionOptions, 'path'),
                    })
                )}
                {(connectionError && connectionType === CONNECTION_TYPE_SOCKET) && (
                    i18n._('Error opening socket: {{host}}:{{port}}', {
                        host: _get(connectionOptions, 'host'),
                        port: _get(connectionOptions, 'port'),
                    })
                )}
            </ToastNotification>
            <Form
                initialValues={initialValues}
                onSubmit={(values) => {
                    // FIXME
                }}
            >
                {({ form }) => {
                    const { values } = form.getState();
                    const connectionType = _get(values, 'connection.type');

                    return (
                        <>
                            <Field name="controller.type">
                                {({ input, meta }) => {
                                    const canSelectControllers = (controller.availableControllers.length > 1);
                                    if (!canSelectControllers) {
                                        return null;
                                    }

                                    const canSelectGrbl = _includes(controller.availableControllers, GRBL);
                                    const canSelectMarlin = _includes(controller.availableControllers, MARLIN);
                                    const canSelectSmoothie = _includes(controller.availableControllers, SMOOTHIE);
                                    const canSelectTinyG = _includes(controller.availableControllers, TINYG);
                                    const isGrblDisabled = !isDisconnected;
                                    const isMarlinDisabled = !isDisconnected;
                                    const isSmoothieDisabled = !isDisconnected;
                                    const isTinyGDisabled = !isDisconnected;
                                    const isGrblSelected = input.value === GRBL;
                                    const isMarlinSelected = input.value === MARLIN;
                                    const isSmoothieSelected = input.value === SMOOTHIE;
                                    const isTinyGSelected = input.value === TINYG;
                                    const handleChangeByValue = (value) => (e) => {
                                        if (!!value) {
                                            config.set('controller.type', value);
                                        }
                                        input.onChange(value);
                                    };

                                    return (
                                        <FormGroup>
                                            <ButtonGroup
                                                btnSize="sm"
                                                style={{
                                                    width: '100%',
                                                }}
                                            >
                                                {canSelectGrbl && (
                                                    <Button
                                                        btnStyle={isGrblSelected ? 'dark' : 'default'}
                                                        disabled={isGrblDisabled}
                                                        onClick={handleChangeByValue(GRBL)}
                                                    >
                                                        {GRBL}
                                                    </Button>
                                                )}
                                                {canSelectMarlin && (
                                                    <Button
                                                        btnStyle={isMarlinSelected ? 'dark' : 'default'}
                                                        disabled={isMarlinDisabled}
                                                        onClick={handleChangeByValue(MARLIN)}
                                                    >
                                                        {MARLIN}
                                                    </Button>
                                                )}
                                                {canSelectSmoothie && (
                                                    <Button
                                                        btnStyle={isSmoothieSelected ? 'dark' : 'default'}
                                                        disabled={isSmoothieDisabled}
                                                        onClick={handleChangeByValue(SMOOTHIE)}
                                                    >
                                                        {SMOOTHIE}
                                                    </Button>
                                                )}
                                                {canSelectTinyG && (
                                                    <Button
                                                        btnStyle={isTinyGSelected ? 'dark' : 'default'}
                                                        disabled={isTinyGDisabled}
                                                        onClick={handleChangeByValue(TINYG)}
                                                    >
                                                        {TINYG}
                                                    </Button>
                                                )}
                                            </ButtonGroup>
                                        </FormGroup>
                                    );
                                }}
                            </Field>
                            <FormGroup>
                                <Field name="connection.type">
                                    {({ input, meta }) => {
                                        const isSerialDisabled = !isDisconnected;
                                        const isSocketDisabled = !isDisconnected;
                                        const isSerialSelected = input.value === CONNECTION_TYPE_SERIAL;
                                        const isSocketSelected = input.value === CONNECTION_TYPE_SOCKET;
                                        const handleChangeByValue = (value) => (e) => {
                                            if (!!value) {
                                                config.set('connection.type', value);
                                            }
                                            input.onChange(value);
                                        };

                                        return (
                                            <ButtonGroup
                                                btnSize="sm"
                                                style={{
                                                    width: '50%',
                                                }}
                                            >
                                                <Button
                                                    btnStyle={isSerialSelected ? 'dark' : 'default'}
                                                    disabled={isSerialDisabled}
                                                    onClick={handleChangeByValue(CONNECTION_TYPE_SERIAL)}
                                                >
                                                    <FontAwesomeIcon icon={['fab', 'usb']} fixedWidth />
                                                    <Space width={8} />
                                                    {i18n._('Serial')}
                                                </Button>
                                                <Button
                                                    btnStyle={isSocketSelected ? 'dark' : 'default'}
                                                    disabled={isSocketDisabled}
                                                    onClick={handleChangeByValue(CONNECTION_TYPE_SOCKET)}
                                                >
                                                    <FontAwesomeIcon icon="network-wired" fixedWidth />
                                                    <Space width={8} />
                                                    {i18n._('Socket')}
                                                </Button>
                                            </ButtonGroup>
                                        );
                                    }}
                                </Field>
                            </FormGroup>
                            {(connectionType === CONNECTION_TYPE_SERIAL) && (
                                <>
                                    <FormGroup>
                                        <Label>{i18n._('Port')}</Label>
                                        <Row style={{ alignItems: 'center' }}>
                                            <Col>
                                                <Field name="connection.serial.path">
                                                    {({ input, meta }) => {
                                                        const canSelectPort = isDisconnected && !isFetchingPorts;
                                                        const isDisabled = !canSelectPort;
                                                        const options = ports.map(port => ({
                                                            value: port.comName,
                                                            label: port.comName,
                                                            manufacturer: port.manufacturer,
                                                            isOpen: port.isOpen,
                                                        }));
                                                        const value = _find(options, { value: input.value }) || null;

                                                        return (
                                                            <Select
                                                                value={value}
                                                                onChange={(option) => {
                                                                    const { value } = option;
                                                                    config.set('connection.serial.path', value);
                                                                    input.onChange(value);
                                                                }}
                                                                isClearable={false}
                                                                isDisabled={isDisabled}
                                                                isLoading={isFetchingPorts}
                                                                isSearchable={false}
                                                                noOptionsMessage={() => i18n._('No ports available')}
                                                                options={options}
                                                                placeholder={i18n._('Choose a port')}
                                                            />
                                                        );
                                                    }}
                                                </Field>
                                            </Col>
                                            <Col width="auto" style={{ width: 30 }}>
                                                <Space width={12} />
                                                <Clickable
                                                    disabled={!canRefreshPorts}
                                                    onClick={handleRefreshPorts}
                                                    title={i18n._('Refresh')}
                                                >
                                                    {({ hovered }) => (
                                                        <FontAwesomeIcon
                                                            icon="sync"
                                                            fixedWidth
                                                            spin={isFetchingPorts}
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
                                        <Row style={{ alignItems: 'center' }}>
                                            <Col>
                                                <Field name="connection.serial.baudRate">
                                                    {({ input, meta }) => {
                                                        const canSelectBaudRate = isDisconnected && !isFetchingBaudRates;
                                                        const isDisabled = !canSelectBaudRate;
                                                        const options = baudRates.map(value => ({
                                                            value,
                                                            label: Number(value).toString(),
                                                        }));
                                                        const value = _find(options, { value: input.value }) || null;

                                                        return (
                                                            <Select
                                                                value={value}
                                                                onChange={(option) => {
                                                                    const { value } = option;
                                                                    config.set('connection.serial.baudRate', value);
                                                                    input.onChange(value);
                                                                }}
                                                                isClearable={false}
                                                                isDisabled={isDisabled}
                                                                isLoading={isFetchingBaudRates}
                                                                isSearchable={false}
                                                                options={options}
                                                                placeholder={i18n._('Choose a baud rate')}
                                                            />
                                                        );
                                                    }}
                                                </Field>
                                            </Col>
                                            <Col width="auto" style={{ width: 30 }}>
                                                <Space width={12} />
                                                <Clickable
                                                    disabled={!canRefreshBaudRates}
                                                    onClick={handleRefreshBaudRates}
                                                    title={i18n._('Refresh')}
                                                >
                                                    {({ hovered }) => (
                                                        <FontAwesomeIcon
                                                            icon="sync"
                                                            fixedWidth
                                                            spin={isFetchingBaudRates}
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
                                        <Field name="connection.serial.rtscts">
                                            {({ input, meta }) => {
                                                const canChange = isDisconnected;
                                                const isDisabled = !canChange;

                                                return (
                                                    <Checkbox
                                                        checked={input.value}
                                                        disabled={isDisabled}
                                                        onChange={(event) => {
                                                            const checked = !!event.target.checked;
                                                            config.set('connection.serial.rtscts', checked);
                                                            input.onChange(checked);
                                                        }}
                                                    >
                                                        <Space width={8} />
                                                        {i18n._('Enable hardware flow control')}
                                                    </Checkbox>
                                                );
                                            }}
                                        </Field>
                                    </FormGroup>
                                </>
                            )}
                            {(connectionType === CONNECTION_TYPE_SOCKET) && (
                                <>
                                    <FormGroup>
                                        <Label>{i18n._('Host')}</Label>
                                        <div>
                                            <Field name="connection.socket.host">
                                                {({ input, meta }) => {
                                                    const canChange = isDisconnected;
                                                    const isDisabled = !canChange;

                                                    return (
                                                        <Input
                                                            value={input.value}
                                                            disabled={isDisabled}
                                                            onChange={(event) => {
                                                                const value = event.target.value;
                                                                config.set('connection.socket.host', value);
                                                                input.onChange(value);
                                                            }}
                                                        />
                                                    );
                                                }}
                                            </Field>
                                        </div>
                                    </FormGroup>
                                    <FormGroup>
                                        <Label>{i18n._('Port')}</Label>
                                        <div>
                                            <Field name="connection.socket.port">
                                                {({ input, meta }) => {
                                                    const canChange = isDisconnected;
                                                    const isDisabled = !canChange;

                                                    return (
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            max={65535}
                                                            step={1}
                                                            value={input.value}
                                                            disabled={isDisabled}
                                                            onChange={(event) => {
                                                                const value = event.target.value;
                                                                if (value > 0) {
                                                                    config.set('connection.socket.port', value);
                                                                }
                                                                input.onChange(value);
                                                            }}
                                                        />
                                                    );
                                                }}
                                            </Field>
                                        </div>
                                    </FormGroup>
                                </>
                            )}
                            <FormGroup>
                                <Field name="autoReconnect">
                                    {({ input, meta }) => {
                                        const canChange = isDisconnected;
                                        const isDisabled = !canChange;

                                        return (
                                            <Checkbox
                                                checked={input.value}
                                                disabled={isDisabled}
                                                onChange={(event) => {
                                                    const checked = !!event.target.checked;
                                                    config.set('autoReconnect', checked);
                                                    input.onChange(checked);
                                                }}
                                            >
                                                <Space width={8} />
                                                {i18n._('Connect automatically')}
                                            </Checkbox>
                                        );
                                    }}
                                </Field>
                            </FormGroup>
                            <FormSpy
                                subscription={{
                                    values: true,
                                    invalid: true,
                                }}
                            >
                                {({ values, invalid }) => {
                                    const canOpenConnection = (() => {
                                        const connectionType = _get(values, 'connection.type');

                                        if (connectionType === CONNECTION_TYPE_SERIAL) {
                                            const path = _get(values, 'connection.serial.path');
                                            const baudRate = _get(values, 'connection.serial.baudRate');
                                            const rtscts = _get(values, 'connection.serial.rtscts');

                                            return !!path && !!baudRate && (rtscts !== undefined);
                                        }

                                        if (connectionType === CONNECTION_TYPE_SOCKET) {
                                            const host = _get(values, 'connection.socket.host');
                                            const port = _get(values, 'connection.socket.port');

                                            return !!host && (port > 0);
                                        }

                                        return false;
                                    })();
                                    const canCloseConnection = isConnected;
                                    const handleOpenConnection = (e) => {
                                        const controllerType = _get(values, 'controller.type');
                                        const connectionType = _get(values, 'connection.type');

                                        const options = {};
                                        _set(options, 'controller.type', controllerType);
                                        _set(options, 'connection.type', connectionType);
                                        _set(options, 'connection.options', ({
                                            [CONNECTION_TYPE_SERIAL]: {
                                                path: _get(values, 'connection.serial.path'),
                                                baudRate: _get(values, 'connection.serial.baudRate'),
                                                rtscts: _get(values, 'connection.serial.rtscts'),
                                            },
                                            [CONNECTION_TYPE_SOCKET]: {
                                                host: _get(values, 'connection.socket.host'),
                                                port: _get(values, 'connection.serial.port'),
                                            },
                                        }[connectionType]));

                                        openConnection(options);
                                    };
                                    const handleCloseConnection = (e) => {
                                        // TODO: Display a warning message to the user if the workflow state is not idle

                                        closeConnection();
                                        fetchPorts();
                                    };

                                    return (
                                        <Margin bottom={8}>
                                            {(isDisconnected || isConnecting) && (
                                                <Button
                                                    btnStyle="primary"
                                                    disabled={!canOpenConnection}
                                                    onClick={handleOpenConnection}
                                                    style={{
                                                        cursor: canOpenConnection ? 'pointer' : 'not-allowed',
                                                    }}
                                                >
                                                    {isConnecting
                                                        ? <FontAwesomeIcon icon="circle-notch" spin />
                                                        : <FontAwesomeIcon icon="toggle-off" />
                                                    }
                                                    <Space width={8} />
                                                    {i18n._('Open')}
                                                </Button>
                                            )}
                                            {(isConnected || isDisconnecting) && (
                                                <Button
                                                    btnStyle="danger"
                                                    disabled={!canCloseConnection}
                                                    onClick={handleCloseConnection}
                                                    style={{
                                                        cursor: canCloseConnection ? 'pointer' : 'not-allowed',
                                                    }}
                                                >
                                                    {isDisconnecting
                                                        ? <FontAwesomeIcon icon="circle-notch" spin />
                                                        : <FontAwesomeIcon icon="toggle-on" />
                                                    }
                                                    <Space width={8} />
                                                    {i18n._('Close')}
                                                </Button>
                                            )}
                                        </Margin>
                                    );
                                }}
                            </FormSpy>
                        </>
                    );
                }}
            </Form>
        </Container>
    );
};

export default connect(store => {
    const connectionError = _get(store, 'connection.error');
    const connectionType = _get(store, 'connection.type');
    const connectionState = _get(store, 'connection.state');
    const connectionOptions = _get(store, 'connection.options');
    const isFetchingPorts = _get(store, 'serialport.isFetchingPorts');
    const isFetchingBaudRates = _get(store, 'serialport.isFetchingBaudRates');
    const ports = ensureArray(_get(store, 'serialport.ports'));
    const baudRates = ensureArray(_get(store, 'serialport.baudRates'));

    return {
        connectionError,
        connectionType,
        connectionState,
        connectionOptions,
        isFetchingPorts,
        isFetchingBaudRates,
        ports,
        baudRates,
    };
}, {
    openConnection: connectionActions.openConnection,
    closeConnection: connectionActions.closeConnection,
    fetchPorts: serialportActions.fetchPorts,
    fetchBaudRates: serialportActions.fetchBaudRates,
})(Connection);
