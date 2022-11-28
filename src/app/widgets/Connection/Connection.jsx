import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalFooter,
  Space,
  Text,
  TextLabel,
} from '@tonic-ui/react';
import chainedFunction from 'chained-function';
import { ensureArray, ensurePositiveNumber } from 'ensure-type';
import _find from 'lodash/find';
import _get from 'lodash/get';
import _includes from 'lodash/includes';
import _isEqual from 'lodash/isEqual';
import _set from 'lodash/set';
import memoize from 'micro-memoize';
import React, {
  useEffect,
  useRef,
  useState,
} from 'react';
import { Form, Field, FormSpy } from 'react-final-form';
import { connect } from 'react-redux';
import Select, { components as SelectComponents } from 'react-select';
import { useTransition, animated } from 'react-spring'; // TODO: remove
import * as connectionActions from 'app/actions/connection';
import * as serialportActions from 'app/actions/serialport';
import { Checkbox } from 'app/components/Checkbox'; // TODO: remove
import Clickable from 'app/components/Clickable';
import InlineError from 'app/components/InlineError';
import Input from 'app/components/FormControl/Input'; // TODO: remove
import FormGroup from 'app/components/FormGroup';
import { Container, Row, Col } from 'app/components/GridSystem'; // TODO: remove
import ModalTemplate from 'app/components/ModalTemplate'; // TODO: remove
import {
  GRBL,
  MARLIN,
  SMOOTHIE,
  TINYG,
} from 'app/constants/controller';
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
import useWidgetConfig from 'app/widgets/shared/useWidgetConfig';
import { composeValidators, required } from 'app/widgets/shared/validations';

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

const validatePortNumber = (min = 1, max = 65535) => value => {
  const port = Number(value);

  return Number.isFinite(port) && port >= min && port <= max
    ? undefined
    : i18n._('Invalid port number. Specify a port number from {{min}} to {{max}}.', { min, max });
};

const getMemoizedInitialValues = memoize((options) => {
  const {
    config,
    serialPorts,
    serialBaudRates,
  } = { ...options };

  const initialValues = {
    controller: {
      type: config.get('controller.type'),
    },
    connection: {
      type: config.get('connection.type'),
      serial: {
        path: config.get('connection.serial.path'),
        baudRate: config.get('connection.serial.baudRate'),
        rtscts: config.get('connection.serial.rtscts'),
      },
      socket: {
        host: config.get('connection.socket.host'),
        port: config.get('connection.socket.port'),
      },
    },
    autoReconnect: config.get('autoReconnect'),
  };

  if (!_find(serialPorts, { path: _get(initialValues, 'connection.serial.path') })) {
    _set(initialValues, 'connection.serial.path', null);
  }

  if (!_includes(serialBaudRates, _get(initialValues, 'connection.serial.baudRate'))) {
    _set(initialValues, 'connection.serial.baudRate', null);
  }

  return initialValues;
}, {
  isEqual: _isEqual,
});

// TODO: use transition component
function DismissibleTransition({
  dismissOnTimeout = 0,
  onShowStart = () => {}, // Triggered when the show animation start.
  onShowEnd = () => {}, // Triggered when the show animation finish.
  onDismissStart = () => {}, // Triggered when the dismiss animation start.
  onDismissEnd = () => {}, // Triggered when the dismiss animation finish.
  children,
}) {
  const containerRef = useRef(null);
  const timerIdRef = useRef(null);
  const [isShow, setShow] = useState(true);
  const transitions = useTransition(isShow, {
    from: {
      opacity: 0,
      height: 0,
      transform: 'translateY(0) scale(1)',
    },
    enter: () => (next) => {
      return next({
        opacity: 1,
        height: containerRef.current?.getBoundingClientRect().height,
        transform: 'translateY(0) scale(1)',
      });
    },
    leave: {
      opacity: 0,
      height: 0,
      transform: 'translateY(0) scale(0.9)',
    },
    config: {
      duration: 150,
    },
    onStart: () => {
      if (isShow) {
        onShowStart();
      } else {
        onDismissStart();
      }
    },
    onRest: () => {
      if (isShow) {
        onShowEnd();
      } else {
        onDismissEnd();
      }
    },
  });
  useEffect(() => {
    if (timerIdRef.current) {
      clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }

    if (dismissOnTimeout > 0) {
      timerIdRef.current = setTimeout(() => {
        setShow(false);
      }, dismissOnTimeout);
    }

    return () => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
      }
    };
  }, [dismissOnTimeout]);
  const onMouseEnter = () => {
    if (timerIdRef.current) {
      clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }
  };
  const onMouseLeave = () => {
    if (timerIdRef.current) {
      clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }

    if (dismissOnTimeout > 0) {
      timerIdRef.current = setTimeout(() => {
        setShow(false);
      }, dismissOnTimeout);
    }
  };
  const show = () => {
    setShow(true);
  };
  const dismiss = () => {
    setShow(false);
  };

  return (
    <>
      {transitions(({ opacity, height, transform }, item) => (
        item && (
          <animated.div
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            style={{
              height,
              opacity,
            }}
          >
            <animated.div
              ref={containerRef}
              style={{
                transform,
                pointerEvents: 'auto',
              }}
            >
              {typeof children === 'function' ? children({ isShow, show, dismiss }) : children}
            </animated.div>
          </animated.div>
        )
      ))}
    </>
  );
}

function Connection({
  connection,
  isConnected,
  isConnecting,
  isDisconnected,
  isDisconnecting,
  isFetchingSerialPorts,
  isFetchingSerialBaudRates,
  serialPorts,
  serialBaudRates,
  openConnection,
  closeConnection,
  fetchSerialPorts,
  fetchSerialBaudRates,
}) {
  const config = useWidgetConfig();
  const initialValues = getMemoizedInitialValues({ config, serialPorts, serialBaudRates });
  const canRefreshSerialPorts = isDisconnected && !isFetchingSerialPorts;
  const canRefreshSerialBaudRates = isDisconnected && !isFetchingSerialBaudRates;
  const autoReconnectedRef = useRef(false);
  const isSerialConnectionReady = useSerialConnectivity({
    ports: serialPorts,
    baudRates: serialBaudRates,
  });
  const isSocketConnectionReady = true;

  // Alert notification
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (!connection.error) {
      return;
    }

    if (connection.type === CONNECTION_TYPE_SERIAL) {
      setAlert({
        severity: 'error',
        title: i18n._('Error opening serial port'),
        message: connection.error,
        duration: 5000,
      });
    } else if (connection.type === CONNECTION_TYPE_SOCKET) {
      setAlert({
        severity: 'error',
        title: i18n._('Error opening socket'),
        message: connection.error,
        duration: 5000,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection.error]);

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
    <>
      <Box>
        {alert && (
          <DismissibleTransition
            dismissOnTimeout={alert?.duration}
            onDismissEnd={() => {
              setAlert(null);
            }}
          >
            {({ isShow, show, dismiss }) => {
              return (
                <Alert
                  severity={alert?.severity}
                  isClosable
                  onClose={dismiss}
                >
                  <Box mb="1x">
                    <Text fontWeight="bold">{alert?.title}</Text>
                  </Box>
                  <Text mr="-9x">
                    {alert?.message}
                  </Text>
                </Alert>
              );
            }}
          </DismissibleTransition>
        )}
      </Box>
      <Container
        fluid
        style={{
          padding: '.75rem',
        }}
      >
        <Form
          initialValues={initialValues}
          onSubmit={(values) => {
            // No submit handler required
          }}
          subscription={{}}
        >
          {({ form }) => (
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
                    input.onChange(value);

                    if (!!value) {
                      config.set('controller.type', value);
                    }
                  };

                  return (
                    <FormGroup>
                      <ButtonGroup variant="default">
                        {canSelectGrbl && (
                          <Button
                            disabled={isGrblDisabled}
                            selected={isGrblSelected}
                            onClick={handleChangeByValue(GRBL)}
                          >
                            {GRBL}
                          </Button>
                        )}
                        {canSelectMarlin && (
                          <Button
                            disabled={isMarlinDisabled}
                            selected={isMarlinSelected}
                            onClick={handleChangeByValue(MARLIN)}
                          >
                            {MARLIN}
                          </Button>
                        )}
                        {canSelectSmoothie && (
                          <Button
                            disabled={isSmoothieDisabled}
                            selected={isSmoothieSelected}
                            onClick={handleChangeByValue(SMOOTHIE)}
                          >
                            {SMOOTHIE}
                          </Button>
                        )}
                        {canSelectTinyG && (
                          <Button
                            disabled={isTinyGDisabled}
                            selected={isTinyGSelected}
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
                      input.onChange(value);

                      if (!!value) {
                        config.set('connection.type', value);
                      }
                    };

                    return (
                      <ButtonGroup variant="default">
                        <Button
                          disabled={isSerialDisabled}
                          selected={isSerialSelected}
                          onClick={handleChangeByValue(CONNECTION_TYPE_SERIAL)}
                        >
                          <FontAwesomeIcon icon={['fab', 'usb']} fixedWidth />
                          <Space width={8} />
                          {i18n._('Serial Port')}
                        </Button>
                        <Button
                          disabled={isSocketDisabled}
                          selected={isSocketSelected}
                          onClick={handleChangeByValue(CONNECTION_TYPE_SOCKET)}
                        >
                          <FontAwesomeIcon icon="network-wired" fixedWidth />
                          <Space width={8} />
                          {i18n._('Wi-Fi')}
                        </Button>
                      </ButtonGroup>
                    );
                  }}
                </Field>
              </FormGroup>
              <Field name="connection.type" subscription={{ value: true }}>
                {({ input, meta }) => {
                  const connectionType = input.value;

                  if (connectionType === CONNECTION_TYPE_SERIAL) {
                    return (
                      <>
                        <FormGroup>
                          <TextLabel mb="2x">
                            {i18n._('Serial port')}
                          </TextLabel>
                          <Row style={{ alignItems: 'center' }}>
                            <Col>
                              <Field name="connection.serial.path">
                                {({ input, meta }) => {
                                  const canSelectSerialPort = isDisconnected && !isFetchingSerialPorts;
                                  const isDisabled = !canSelectSerialPort;
                                  const options = serialPorts.map(port => ({
                                    value: port.path,
                                    label: port.path,
                                    manufacturer: port.manufacturer,
                                    connected: port.connected,
                                  }));
                                  const value = _find(options, { value: input.value }) || null;

                                  return (
                                    <Select
                                      components={{
                                        Option: SerialPortOption,
                                        SingleValue: SerialPortSingleValue,
                                      }}
                                      value={value}
                                      onChange={(option) => {
                                        const { value } = option;
                                        input.onChange(value);

                                        config.set('connection.serial.path', value);
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
                          <TextLabel mb="2x">
                            {i18n._('Baud rate')}
                          </TextLabel>
                          <Row style={{ alignItems: 'center' }}>
                            <Col>
                              <Field name="connection.serial.baudRate">
                                {({ input, meta }) => {
                                  const canSelectSerialBaudRate = isDisconnected && !isFetchingSerialBaudRates;
                                  const isDisabled = !canSelectSerialBaudRate;
                                  const options = serialBaudRates.map(value => ({
                                    value: ensurePositiveNumber(value),
                                    label: ensurePositiveNumber(value).toString(),
                                  }));
                                  const value = _find(options, { value: input.value }) || null;

                                  return (
                                    <Select
                                      value={value}
                                      onChange={(option) => {
                                        const { value } = option;
                                        input.onChange(value);

                                        config.set('connection.serial.baudRate', value);
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
                                    input.onChange(checked);

                                    config.set('connection.serial.rtscts', checked);
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
                    );
                  }

                  if (connectionType === CONNECTION_TYPE_SOCKET) {
                    return (
                      <>
                        <FormGroup>
                          <TextLabel mb="2x">
                            {i18n._('Host')}
                          </TextLabel>
                          <Box>
                            <Field
                              name="connection.socket.host"
                              validate={required}
                            >
                              {({ input, meta }) => {
                                const canChange = isDisconnected;
                                const isDisabled = !canChange;

                                return (
                                  <>
                                    <Input
                                      {...input}
                                      type="text"
                                      disabled={isDisabled}
                                      onChange={(event) => {
                                        const value = event.target.value;
                                        input.onChange(value);

                                        config.set('connection.socket.host', value);
                                      }}
                                    />
                                    {(meta.error && meta.touched) && (
                                      <InlineError>{meta.error}</InlineError>
                                    )}
                                  </>
                                );
                              }}
                            </Field>
                          </Box>
                        </FormGroup>
                        <FormGroup>
                          <TextLabel mb="2x">
                            {i18n._('Port')}
                          </TextLabel>
                          <Box>
                            <Field
                              name="connection.socket.port"
                              validate={composeValidators(required, validatePortNumber(1, 65535))}
                            >
                              {({ input, meta }) => {
                                const canChange = isDisconnected;
                                const isDisabled = !canChange;

                                return (
                                  <>
                                    <Input
                                      {...input}
                                      type="number"
                                      min={0}
                                      max={65535}
                                      step={1}
                                      disabled={isDisabled}
                                      onChange={(event) => {
                                        const value = event.target.value;
                                        input.onChange(value);

                                        const port = Number(value);
                                        if (Number.isFinite(port) && port >= 1 && port <= 65535) {
                                          config.set('connection.socket.port', port);
                                        }
                                      }}
                                    />
                                    {(meta.error && meta.touched) && (
                                      <InlineError>{meta.error}</InlineError>
                                    )}
                                  </>
                                );
                              }}
                            </Field>
                          </Box>
                        </FormGroup>
                      </>
                    );
                  }

                  return null;
                }}
              </Field>
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
                          input.onChange(checked);

                          config.set('autoReconnect', checked);
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
                      <Modal
                        isOpen={true}
                        onClose={onClose}
                      >
                        <ModalOverlay />
                        <ModalContent>
                          <ModalBody>
                            <ModalTemplate type="warning">
                              {({ PrimaryMessage, DescriptiveMessage }) => (
                                <DescriptiveMessage>
                                  {i18n._('Are you sure you want to close the connection?')}
                                </DescriptiveMessage>
                              )}
                            </ModalTemplate>
                          </ModalBody>
                          <ModalFooter>
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
                          </ModalFooter>
                        </ModalContent>
                      </Modal>
                    ));
                  };

                  return (
                    <>
                      {(isDisconnected || isConnecting) && (
                        <Button
                          btnStyle={canOpenConnection ? 'primary' : 'secondary'}
                          disabled={!canOpenConnection}
                          onClick={handleOpenConnection}
                          style={{
                            cursor: canOpenConnection ? 'pointer' : 'not-allowed',
                          }}
                        >
                          {isConnecting
                            ? <FontAwesomeIcon icon="circle-notch" spin />
                            : <FontAwesomeIcon icon="toggle-off" />}
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
                            : <FontAwesomeIcon icon="toggle-on" />}
                          <Space width={8} />
                          {i18n._('Close')}
                        </Button>
                      )}
                    </>
                  );
                }}
              </FormSpy>
            </>
          )}
        </Form>
      </Container>
    </>
  );
}

const mapStateToProps = (store) => {
  const connection = _get(store, 'connection', {});
  const connectionState = _get(store, 'connection.state');
  const isConnected = (connectionState === CONNECTION_STATE_CONNECTED);
  const isConnecting = (connectionState === CONNECTION_STATE_CONNECTING);
  const isDisconnected = (connectionState === CONNECTION_STATE_DISCONNECTED);
  const isDisconnecting = (connectionState === CONNECTION_STATE_DISCONNECTING);
  const isFetchingSerialPorts = _get(store, 'serialport.isFetchingPorts');
  const isFetchingSerialBaudRates = _get(store, 'serialport.isFetchingBaudRates');
  const serialPorts = ensureArray(_get(store, 'serialport.ports'));
  const serialBaudRates = ensureArray(_get(store, 'serialport.baudRates'));

  return {
    connection, // requires deep comparison
    isConnected,
    isConnecting,
    isDisconnected,
    isDisconnecting,
    isFetchingSerialPorts,
    isFetchingSerialBaudRates,
    serialPorts,
    serialBaudRates,
  };
};

const mapDispatchToProps = {
  openConnection: connectionActions.openConnection,
  closeConnection: connectionActions.closeConnection,
  fetchSerialPorts: serialportActions.fetchPorts,
  fetchSerialBaudRates: serialportActions.fetchBaudRates,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  {
    // Use isEqual to perform a deep comparison between objects.
    areStatePropsEqual: _isEqual,
  }
)(Connection);

function SerialPortOption({
  children,
  ...props
}) {
  const data = _get(props, 'data');
  const connected = !!data.connected;
  const manufacturer = data.manufacturer;

  return (
    <SelectComponents.Option {...props}>
      <Container fluid>
        <Row>
          <Col style={{ wordBreak: 'break-all' }}>
            {children}
          </Col>
          <Col width="auto">
            <Space width={8} />
            <FontAwesomeIcon icon="lock" fixedWidth style={{ opacity: (connected ? 1 : 0) }} />
          </Col>
        </Row>
      </Container>
      {manufacturer && (
        <Box ml="6x">
          <Text color="#888">
            {i18n._('Manufacturer: {{manufacturer}}', { manufacturer })}
          </Text>
        </Box>
      )}
    </SelectComponents.Option>
  );
}

function SerialPortSingleValue({
  children,
  ...props
}) {
  const data = _get(props, 'data');
  const connected = !!data.connected;

  return (
    <SelectComponents.SingleValue {...props}>
      {connected && (
        <>
          <FontAwesomeIcon icon="lock" fixedWidth />
          <Space width={8} />
        </>
      )}
      {children}
    </SelectComponents.SingleValue>
  );
}
