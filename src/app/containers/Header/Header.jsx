import React, { Fragment, Component } from 'react';
import { withRouter } from 'react-router-dom';
import semver from 'semver';
import styled from 'styled-components';
import _without from 'lodash/without';
import Push from 'push.js';
import api from 'app/api';
import Anchor from 'app/components/Anchor';
import Badge from 'app/components/Badge';
import { Button } from 'app/components/Buttons';
import { Container, Row, Col } from 'app/components/GridSystem';
import Dropdown, { MenuItem } from 'app/components/Dropdown';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import Hoverable from 'app/components/Hoverable';
import Image from 'app/components/Image';
import Space from 'app/components/Space';
import { Tooltip } from 'app/components/Tooltip';
import Text from 'app/components/Text';
import settings from 'app/config/settings';
import combokeys from 'app/lib/combokeys';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import log from 'app/lib/log';
import * as user from 'app/lib/user';
import config from 'app/store/config';
import logo from 'app/images/logo-badge-32x32.png';
import QuickAccessToolbar from './QuickAccessToolbar';

const releases = 'https://github.com/cncjs/cncjs/releases';

const NavDropdownToggle = styled(Button)`
    & {
        background: none;
        border: none;
        opacity: 0.6;

        :hover {
            background: none;
            opacity: 1;
        }
    }
`;

class Header extends Component {
    static propTypes = {
        ...withRouter.propTypes
    };

    state = this.getInitialState();
    actions = {
        requestPushPermission: () => {
            const onGranted = () => {
                this.setState({ pushPermission: Push.Permission.GRANTED });
            };
            const onDenied = () => {
                this.setState({ pushPermission: Push.Permission.DENIED });
            };
            // Note that if "Permission.DEFAULT" is returned, no callback is executed
            const permission = Push.Permission.request(onGranted, onDenied);
            if (permission === Push.Permission.DEFAULT) {
                this.setState({ pushPermission: Push.Permission.DEFAULT });
            }
        },
        checkForUpdates: async () => {
            try {
                const res = await api.getState();
                const { checkForUpdates } = res.body;

                if (checkForUpdates) {
                    const res = await api.getLatestVersion();
                    const { time, version } = res.body;

                    this._isMounted && this.setState({
                        latestVersion: version,
                        latestTime: time
                    });
                }
            } catch (res) {
                // Ignore error
            }
        },
        fetchCommands: async () => {
            try {
                const res = await api.commands.fetch({ paging: false });
                const { records: commands } = res.body;

                this._isMounted && this.setState({
                    commands: commands.filter(command => command.enabled)
                });
            } catch (res) {
                // Ignore error
            }
        },
        runCommand: async (cmd) => {
            try {
                const res = await api.commands.run(cmd.id);
                const { taskId } = res.body;

                this.setState({
                    commands: this.state.commands.map(c => {
                        return (c.id === cmd.id) ? { ...c, taskId: taskId, err: null } : c;
                    })
                });
            } catch (res) {
                // Ignore error
            }
        }
    };

    actionHandlers = {
        CONTROLLER_COMMAND: (event, { command }) => {
            // feedhold, cyclestart, homing, unlock, reset
            controller.command(command);
        }
    };

    controllerEvents = {
        'config:change': () => {
            this.actions.fetchCommands();
        },
        'task:start': (taskId) => {
            this.setState({
                runningTasks: this.state.runningTasks.concat(taskId)
            });
        },
        'task:finish': (taskId, code) => {
            const err = (code !== 0) ? new Error(`errno=${code}`) : null;
            let cmd = null;

            this.setState({
                commands: this.state.commands.map(c => {
                    if (c.taskId !== taskId) {
                        return c;
                    }
                    cmd = c;
                    return {
                        ...c,
                        taskId: null,
                        err: err
                    };
                }),
                runningTasks: _without(this.state.runningTasks, taskId)
            });

            if (cmd && this.state.pushPermission === Push.Permission.GRANTED) {
                Push.create(cmd.title, {
                    body: code === 0
                        ? i18n._('Command succeeded')
                        : i18n._('Command failed ({{err}})', { err: err }),
                    icon: 'images/logo-badge-32x32.png',
                    timeout: 10 * 1000,
                    onClick: function () {
                        window.focus();
                        this.close();
                    }
                });
            }
        },
        'task:error': (taskId, err) => {
            let cmd = null;

            this.setState({
                commands: this.state.commands.map(c => {
                    if (c.taskId !== taskId) {
                        return c;
                    }
                    cmd = c;
                    return {
                        ...c,
                        taskId: null,
                        err: err
                    };
                }),
                runningTasks: _without(this.state.runningTasks, taskId)
            });

            if (cmd && this.state.pushPermission === Push.Permission.GRANTED) {
                Push.create(cmd.title, {
                    body: i18n._('Command failed ({{err}})', { err: err }),
                    icon: 'images/logo-badge-32x32.png',
                    timeout: 10 * 1000,
                    onClick: function () {
                        window.focus();
                        this.close();
                    }
                });
            }
        }
    };

    _isMounted = false;

    getInitialState() {
        let pushPermission = '';
        try {
            // Push.Permission.get() will throw an error if Push is not supported on this device
            pushPermission = Push.Permission.get();
        } catch (e) {
            // Ignore
        }

        return {
            pushPermission: pushPermission,
            commands: [],
            runningTasks: [],
            currentVersion: settings.version,
            latestVersion: settings.version
        };
    }

    componentDidMount() {
        this._isMounted = true;

        this.addActionHandlers();
        this.addControllerEvents();

        // Initial actions
        this.actions.checkForUpdates();
        this.actions.fetchCommands();
    }

    componentWillUnmount() {
        this._isMounted = false;

        this.removeActionHandlers();
        this.removeControllerEvents();

        this.runningTasks = [];
    }

    addActionHandlers() {
        Object.keys(this.actionHandlers).forEach(eventName => {
            const callback = this.actionHandlers[eventName];
            combokeys.on(eventName, callback);
        });
    }

    removeActionHandlers() {
        Object.keys(this.actionHandlers).forEach(eventName => {
            const callback = this.actionHandlers[eventName];
            combokeys.removeListener(eventName, callback);
        });
    }

    addControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
            const callback = this.controllerEvents[eventName];
            controller.addListener(eventName, callback);
        });
    }

    removeControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
            const callback = this.controllerEvents[eventName];
            controller.removeListener(eventName, callback);
        });
    }

    mapCommandsToMenuItems(commands) {
        if (commands.length === 0) {
            return null;
        }

        return (
            <Fragment>
                <MenuItem header>
                    <Row
                        style={{
                            justifyContent: 'space-between',
                            flexWrap: 'nowrap',
                        }}
                    >
                        <Col width="auto">
                            {i18n._('Command')}
                        </Col>
                        <Col width="auto">
                            <Space width={12} />
                            {(this.state.pushPermission === Push.Permission.GRANTED) && (
                                <FontAwesomeIcon icon="bell" fixedWidth />
                            )}
                            {(this.state.pushPermission === Push.Permission.DEFAULT) && (
                                <Anchor
                                    onClick={this.actions.requestPushPermission}
                                    title={i18n._('Show notifications')}
                                >
                                    <FontAwesomeIcon icon="bell" fixedWidth />
                                </Anchor>
                            )}
                        </Col>
                    </Row>
                </MenuItem>
                {commands.map(cmd => {
                    let icon = null;
                    let spin = false;

                    if (this.state.runningTasks.indexOf(cmd.taskId) >= 0) { // Task is runing
                        icon = 'circle-notch';
                        spin = true;
                    }
                    if (cmd.err) {
                        icon = 'exclamation-circle';
                        spin = false;
                    }

                    return (
                        <MenuItem
                            key={cmd.id}
                            disabled={cmd.disabled}
                            onSelect={() => {
                                this.actions.runCommand(cmd);
                            }}
                        >
                            <Row style={{ justifyContent: 'space-between' }}>
                                <Col width="auto">
                                    {cmd.title || cmd.command}
                                </Col>
                                <Col width="auto" title={cmd.err}>
                                    <Space width={12} />
                                    {icon && (
                                        <FontAwesomeIcon icon={icon} spin={spin} fixedWidth />
                                    )}
                                </Col>
                            </Row>
                        </MenuItem>
                    );
                })}
                <MenuItem divider />
            </Fragment>
        );
    }

    render() {
        const { history, location } = this.props;
        const { commands, currentVersion, latestVersion } = this.state;
        const newUpdateAvailable = semver.lt(currentVersion, latestVersion);
        const sessionEnabled = config.get('session.enabled');
        const signedInName = config.get('session.name');

        return (
            <Container fluid>
                <Row
                    style={{
                        justifyContent: 'space-between',
                        flexWrap: 'nowrap',
                    }}
                >
                    <Col
                        width="auto"
                        style={{
                            textAlign: 'center',
                            width: 60,
                        }}
                    >
                        <Hoverable>
                            {(hovered) => (
                                <div
                                    role="presentation"
                                    style={{
                                        cursor: hovered ? 'pointer' : 'default',
                                        height: 60,
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                    title={`${settings.productName} ${settings.version}`}
                                    onClick={() => {
                                        window.open(releases, '_blank');
                                    }}
                                >
                                    <div style={{ width: '100%' }}>
                                        <Image src={logo} width={32} height={32} />
                                    </div>
                                    <Text
                                        color={hovered ? '#fff' : '#9d9d9d'}
                                        size="50%"
                                    >
                                        {settings.version}
                                    </Text>
                                </div>
                            )}
                        </Hoverable>
                        {newUpdateAvailable && (
                            <Tooltip content={i18n._('New update available')}>
                                <Badge
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        right: 0,
                                        backgroundColor: '#007bff',
                                        color: '#fff',
                                        cursor: 'default',
                                    }}
                                >
                                    N
                                </Badge>
                            </Tooltip>
                        )}
                    </Col>
                    <Col
                        width="auto"
                        style={{
                            paddingLeft: 12,
                            paddingRight: 12,
                            display: 'flex',
                            alignItems: 'center',
                        }}
                    >
                        <Row>
                            <Col width="auto">
                                {location.pathname === '/workspace' &&
                                <QuickAccessToolbar />
                                }
                            </Col>
                            <Col width="auto">
                                <Space width={12} />
                            </Col>
                            <Col width="auto">
                                {sessionEnabled &&
                                <Dropdown
                                    pullRight
                                >
                                    <Dropdown.Toggle
                                        componentClass={NavDropdownToggle}
                                        btnStyle="dark"
                                    >
                                        <FontAwesomeIcon icon="user" />
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu>
                                        <MenuItem header>
                                            {i18n._('Signed in as {{name}}', { name: signedInName })}
                                        </MenuItem>
                                        <MenuItem divider />
                                        <MenuItem
                                            onClick={() => {
                                                history.push('/settings/account');
                                            }}
                                        >
                                            <FontAwesomeIcon icon="user" fixedWidth />
                                            <Space width="8" />
                                            {i18n._('Account')}
                                        </MenuItem>
                                        <MenuItem
                                            onClick={() => {
                                                if (user.isAuthenticated()) {
                                                    log.debug('Destroy and cleanup the WebSocket connection');
                                                    controller.disconnect();

                                                    user.signout();

                                                    // Remember current location
                                                    history.replace(location.pathname);
                                                }
                                            }}
                                        >
                                            <FontAwesomeIcon icon="sign-out-alt" fixedWidth />
                                            <Space width="8" />
                                            {i18n._('Sign Out')}
                                        </MenuItem>
                                    </Dropdown.Menu>
                                </Dropdown>
                                }
                                <Dropdown
                                    pullRight
                                >
                                    <Dropdown.Toggle
                                        componentClass={NavDropdownToggle}
                                        btnStyle="dark"
                                        noCaret
                                        title={i18n._('Options')}
                                    >
                                        <FontAwesomeIcon icon="ellipsis-v" />
                                        {(this.state.runningTasks.length > 0) && (
                                            <Badge
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    right: 0,
                                                    backgroundColor: '#17a2b8',
                                                    color: '#fff',
                                                    cursor: 'default',
                                                }}
                                            >
                                                {this.state.runningTasks.length}
                                            </Badge>
                                        )}
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu>
                                        {(commands.length > 0) &&
                                        this.mapCommandsToMenuItems(commands)
                                        }
                                        <MenuItem
                                            onClick={() => {
                                                const url = 'https://github.com/cncjs/cncjs/wiki';
                                                window.open(url, '_blank');
                                            }}
                                        >
                                            {i18n._('Help')}
                                        </MenuItem>
                                        <MenuItem
                                            onClick={() => {
                                                const url = 'https://github.com/cncjs/cncjs/issues';
                                                window.open(url, '_blank');
                                            }}
                                        >
                                            {i18n._('Report an issue')}
                                        </MenuItem>
                                    </Dropdown.Menu>
                                </Dropdown>
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </Container>
        );
    }
}

export default withRouter(Header);
