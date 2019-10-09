import chainedFunction from 'chained-function';
import ensureArray from 'ensure-array';
import _find from 'lodash/find';
import _get from 'lodash/get';
import _includes from 'lodash/includes';
import _set from 'lodash/set';
import _uniqueId from 'lodash/uniqueId';
import React, { useContext, useEffect, useRef } from 'react';
import { Form, Field, FormSpy } from 'react-final-form';
import { connect } from 'react-redux';
import Select, { components as SelectComponents } from 'react-select';
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
import Modal from 'app/components/Modal';
import ModalTemplate from 'app/components/ModalTemplate';
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
import usePrevious from 'app/hooks/usePrevious';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import portal from 'app/lib/portal';
import { WidgetConfigContext } from 'app/widgets/context';

// @param {string} options.path
// @param {number} options.baudRate
// @param {boolean} options.rtscts
const validateSerialConnectionOptions = (options) => {
    const { path, baudRate, rtscts } = { ...options };
    return (!!path) && (baudRate > 0) && (rtscts !== undefined);
};

// @param {string} options.host
// @param {number} options.port
const validateSocketConnectionOptions = (options) => {
    const { host, port } = { ...options };
    return !!host && (port > 0);
};

// [Hook] The useReady hook returns a boolean value that indicates whether it is ready to connect.
// @param {array} ports
// @param {array} baudRates
const useSerialConnectivity = ({ ports, baudRates }) => {
    const isPortReadyRef = useRef(false);
    const isBaudRateReadyRef = useRef(false);
    const prevPorts = usePrevious(ports, []);
    const prevBaudRates = usePrevious(baudRates, []);

    if (prevPorts.length === 0 && ports.length > 0) {
        isPortReadyRef.current = true;
    }
    if (prevBaudRates.length === 0 && baudRates.length > 0) {
        isBaudRateReadyRef.current = true;
    }

    const isPortReady = isPortReadyRef.current;
    const isBaudRateReady = isBaudRateReadyRef.current;
    const isReady = (isPortReady && isBaudRateReady);

    return isReady;
};

const Connection = ({
    connectionError,
    connectionType,
    connectionState,
    connectionOptions,
    isFetchingSerialPorts,
    isFetchingSerialBaudRates,
    serialPorts,
    serialBaudRates,
    openConnection,
    closeConnection,
    fetchSerialPorts,
    fetchSerialBaudRates,
}) => {
    const config = useContext(WidgetConfigContext);
    const initialValues = {
        controller: {
            type: config.get('controller.type'),
        },
        connection: {
            type: config.get('connection.type'),
            serial: {
                path: (() => {
                    const path = config.get('connection.serial.path');
                    return _find(serialPorts, { comName: path }) ? path : null;
                })(),
                baudRate: (() => {
                    const baudRate = config.get('connection.serial.baudRate');
                    return _includes(serialBaudRates, baudRate) ? baudRate : null;
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
    const isConnected = (connectionState === CONNECTION_STATE_CONNECTED);
    const isConnecting = (connectionState === CONNECTION_STATE_CONNECTING);
    const isDisconnected = (connectionState === CONNECTION_STATE_DISCONNECTED);
    const isDisconnecting = (connectionState === CONNECTION_STATE_DISCONNECTING);
    const canRefreshSerialPorts = isDisconnected && !isFetchingSerialPorts;
    const canRefreshSerialBaudRates = isDisconnected && !isFetchingSerialBaudRates;
    const autoReconnectedRef = useRef(false);
    const isSerialConnectionReady = useSerialConnectivity({
        ports: serialPorts,
        baudRates: serialBaudRates,
    });
    const isSocketConnectionReady = true;

    { // Fetch ports and baud rates only after the initial render
        useMount(() => {
            fetchSerialPorts();
            fetchSerialBaudRates();
        });
    }

    { // Auto reconnect for serial connection
        useEffect(() => {
            const connectionType = config.get('connection.type');
            if (connectionType !== CONNECTION_TYPE_SERIAL) {
                return;
            }

            if (!isSerialConnectionReady) {
                return;
            }

            if (autoReconnectedRef.current) {
                return;
            }

            const autoReconnect = config.get('autoReconnect');
            if (!autoReconnect) {
                return;
            }

            const { path, baudRate, rtscts } = config.get('connection.serial');
            if (!validateSerialConnectionOptions({ path, baudRate, rtscts })) {
                return;
            }

            const controllerType = config.get('controller.type');
            const options = {};
            _set(options, 'controller.type', controllerType);
            _set(options, 'connection.type', connectionType);
            _set(options, 'connection.options', { path, baudRate, rtscts });

            openConnection(options);

            // Set autoReconnectedRef.current to true when attempting to connect.
            autoReconnectedRef.current = true;
        }, [isSerialConnectionReady, config, openConnection]);
    }

    { // Auto reconnect for socket connection
        useEffect(() => {
            const connectionType = config.get('connection.type');
            if (connectionType !== CONNECTION_TYPE_SOCKET) {
                return;
            }

            if (!isSocketConnectionReady) {
                return;
            }

            if (autoReconnectedRef.current) {
                return;
            }

            const autoReconnect = config.get('autoReconnect');
            if (!autoReconnect) {
                return;
            }

            const { host, port } = config.get('connection.socket');
            if (!validateSocketConnectionOptions({ host, port })) {
                return;
            }

            const options = {};
            const controllerType = config.get('controller.type');
            _set(options, 'controller.type', controllerType);
            _set(options, 'connection.type', connectionType);
            _set(options, 'connection.options', { host, port });

            openConnection(options);

            // Set autoReconnectedRef.current to true when attempting to connect.
            autoReconnectedRef.current = true;
        }, [isSocketConnectionReady, config, openConnection]);
    }

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
                    // No submit handler required
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
                                        <Label>{i18n._('Serial port')}</Label>
                                        <Row style={{ alignItems: 'center' }}>
                                            <Col>
                                                <Field name="connection.serial.path">
                                                    {({ input, meta }) => {
                                                        const canSelectSerialPort = isDisconnected && !isFetchingSerialPorts;
                                                        const isDisabled = !canSelectSerialPort;
                                                        const options = serialPorts.map(port => ({
                                                            value: port.comName,
                                                            label: port.comName,
                                                            manufacturer: port.manufacturer,
                                                            connected: port.connected,
                                                        }));
                                                        const value = _find(options, { value: input.value }) || null;

                                                        return (
                                                            <Select
                                                                components={{
                                                                    SingleValue: SerialPortSingleValue,
                                                                }}
                                                                value={value}
                                                                onChange={(option) => {
                                                                    const { value } = option;
                                                                    config.set('connection.serial.path', value);
                                                                    input.onChange(value);
                                                                }}
                                                                isClearable={false}
                                                                isDisabled={isDisabled}
                                                                isLoading={isFetchingSerialPorts}
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
                                                    disabled={!canRefreshSerialPorts}
                                                    onClick={() => {
                                                        fetchSerialPorts();
                                                    }}
                                                    title={i18n._('Refresh')}
                                                >
                                                    {({ hovered }) => (
                                                        <FontAwesomeIcon
                                                            icon="sync"
                                                            fixedWidth
                                                            spin={isFetchingSerialPorts}
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
                                                        const canSelectSerialBaudRate = isDisconnected && !isFetchingSerialBaudRates;
                                                        const isDisabled = !canSelectSerialBaudRate;
                                                        const options = serialBaudRates.map(value => ({
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
                                                                isLoading={isFetchingSerialBaudRates}
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
                                                    disabled={!canRefreshSerialBaudRates}
                                                    onClick={() => {
                                                        fetchSerialBaudRates();
                                                    }}
                                                    title={i18n._('Refresh')}
                                                >
                                                    {({ hovered }) => (
                                                        <FontAwesomeIcon
                                                            icon="sync"
                                                            fixedWidth
                                                            spin={isFetchingSerialBaudRates}
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

                                            return validateSerialConnectionOptions({ path, baudRate, rtscts });
                                        }

                                        if (connectionType === CONNECTION_TYPE_SOCKET) {
                                            const host = _get(values, 'connection.socket.host');
                                            const port = _get(values, 'connection.socket.port');

                                            return validateSocketConnectionOptions({ host, port });
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
                                    const confirmCloseConnection = (e) => {
                                        portal(({ onClose }) => (
                                            <Modal onClose={onClose}>
                                                <Modal.Body>
                                                    <ModalTemplate type="warning">
                                                        {({ PrimaryMessage, DescriptiveMessage }) => (
                                                            <DescriptiveMessage>
                                                                {i18n._('Are you sure you want to close the connection?')}
                                                            </DescriptiveMessage>
                                                        )}
                                                    </ModalTemplate>
                                                </Modal.Body>
                                                <Modal.Footer>
                                                    <Button onClick={onClose}>
                                                        {i18n._('Cancel')}
                                                    </Button>
                                                    <Button
                                                        btnStyle="primary"
                                                        onClick={chainedFunction(
                                                            (e) => {
                                                                closeConnection();
                                                                fetchSerialPorts();
                                                                fetchSerialBaudRates();
                                                            },
                                                            onClose,
                                                        )}
                                                    >
                                                        {i18n._('OK')}
                                                    </Button>
                                                </Modal.Footer>
                                            </Modal>
                                        ));
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
                                                    onClick={confirmCloseConnection}
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
    const isFetchingSerialPorts = _get(store, 'serialport.isFetchingPorts');
    const isFetchingSerialBaudRates = _get(store, 'serialport.isFetchingBaudRates');
    const serialPorts = ensureArray(_get(store, 'serialport.ports'));
    const serialBaudRates = ensureArray(_get(store, 'serialport.baudRates'));

    return {
        connectionError,
        connectionType,
        connectionState,
        connectionOptions,
        isFetchingSerialPorts,
        isFetchingSerialBaudRates,
        serialPorts,
        serialBaudRates,
    };
}, {
    openConnection: connectionActions.openConnection,
    closeConnection: connectionActions.closeConnection,
    fetchSerialPorts: serialportActions.fetchPorts,
    fetchSerialBaudRates: serialportActions.fetchBaudRates,
})(Connection);

const SerialPortSingleValue = ({
    children,
    ...innerProps,
}) => {
    const data = _get(innerProps, 'data');
    const connected = !!data.connected;

    return (
        <SelectComponents.SingleValue {...innerProps}>
            {connected && (
                <>
                    <FontAwesomeIcon icon="lock" fixedWidth />
                    <Space width={8} />
                </>
            )}
            {children}
        </SelectComponents.SingleValue>
    );
};
