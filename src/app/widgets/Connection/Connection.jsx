import find from 'lodash/find';
import get from 'lodash/get';
import includes from 'lodash/includes';
import map from 'lodash/map';
import PropTypes from 'prop-types';
import React, { Fragment, PureComponent } from 'react';
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
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import {
    GRBL,
    MARLIN,
    SMOOTHIE,
    TINYG
} from 'app/constants';

class Connection extends PureComponent {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    isPortInUse = (port) => {
        const { state } = this.props;
        port = port || state.port;
        const o = find(state.ports, { port }) || {};
        return !!(o.inuse);
    };

    renderPortOption = (option) => {
        const { label, inuse, manufacturer } = option;
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
                    {inuse && (
                        <Fragment>
                            <FontAwesomeIcon icon="lock" />
                            <Space width={8} />
                        </Fragment>
                    )}
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
        const { label, inuse } = option;
        const notLoading = !(state.loading);
        const canChangePort = notLoading;
        const style = {
            color: canChangePort ? '#333' : '#ccc',
            textOverflow: 'ellipsis',
            overflow: 'hidden'
        };
        return (
            <div style={style} title={label}>
                {inuse && (
                    <Fragment>
                        <FontAwesomeIcon icon="lock" />
                        <Space width={8} />
                    </Fragment>
                )}
                {label}
            </div>
        );
    };

    renderBaudrateValue = (option) => {
        const { state } = this.props;
        const notLoading = !(state.loading);
        const notInUse = !(this.isPortInUse(state.port));
        const canChangeBaudrate = notLoading && notInUse;
        const style = {
            color: canChangeBaudrate ? '#333' : '#ccc',
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
            loading, connecting, connected,
            controllerType,
            ports, baudrates,
            port, baudrate,
            autoReconnect,
            connection,
            alertMessage
        } = state;
        const enableHardwareFlowControl = get(connection, 'serial.rtscts', false);
        const canSelectControllers = (controller.loadedControllers.length > 1);
        const hasGrblController = includes(controller.loadedControllers, GRBL);
        const hasMarlinController = includes(controller.loadedControllers, MARLIN);
        const hasSmoothieController = includes(controller.loadedControllers, SMOOTHIE);
        const hasTinyGController = includes(controller.loadedControllers, TINYG);
        const notLoading = !loading;
        const notConnecting = !connecting;
        const notConnected = !connected;
        const canRefresh = notLoading && notConnected;
        const canChangeController = notLoading && notConnected;
        const canChangePort = notLoading && notConnected;
        const canChangeBaudrate = notLoading && notConnected && (!(this.isPortInUse(port)));
        const canToggleHardwareFlowControl = notConnected;
        const canOpenPort = port && baudrate && notConnecting && notConnected;
        const canClosePort = connected;

        return (
            <Container>
                {alertMessage && (
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
                        <Col width={10}>
                            <Select
                                backspaceRemoves={false}
                                className="sm"
                                clearable={false}
                                disabled={!canChangePort}
                                name="port"
                                noResultsText={i18n._('No ports available')}
                                onChange={actions.onChangePortOption}
                                optionRenderer={this.renderPortOption}
                                options={map(ports, (o) => ({
                                    value: o.port,
                                    label: o.port,
                                    manufacturer: o.manufacturer,
                                    inuse: o.inuse
                                }))}
                                placeholder={i18n._('Choose a port')}
                                searchable={false}
                                value={port}
                                valueRenderer={this.renderPortValue}
                            />
                        </Col>
                        <Col width={2}>
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
                                            color: (hovered ? '#222' : '#666'),
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
                        <Col width={10}>
                            <Select
                                backspaceRemoves={false}
                                className="sm"
                                clearable={false}
                                disabled={!canChangeBaudrate}
                                menuContainerStyle={{ zIndex: 5 }}
                                name="baudrate"
                                onChange={actions.onChangeBaudrateOption}
                                options={map(baudrates, (value) => ({
                                    value: value,
                                    label: Number(value).toString()
                                }))}
                                placeholder={i18n._('Choose a baud rate')}
                                searchable={false}
                                value={baudrate}
                                valueRenderer={this.renderBaudrateValue}
                            />
                        </Col>
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

export default Connection;
