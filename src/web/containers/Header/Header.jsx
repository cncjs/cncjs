import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import { Nav, Navbar, NavDropdown, MenuItem, OverlayTrigger, Tooltip } from 'react-bootstrap';
import semver from 'semver';
import without from 'lodash/without';
import api from '../../api';
import Anchor from '../../components/Anchor';
import settings from '../../config/settings';
import confirm from '../../lib/confirm';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import store from '../../store';
import QuickAccessToolbar from './QuickAccessToolbar';

const releases = 'https://github.com/cheton/cnc/releases';

const newUpdateAvailableTooltip = () => {
    return (
        <Tooltip
            id="navbarBrandTooltip"
            style={{ color: '#fff' }}
        >
            <div>{i18n._('New update available')}</div>
        </Tooltip>
    );
};

class Header extends Component {
    static propTypes = {
        path: PropTypes.string
    };

    state = {
        commands: [],
        runningTasks: [],
        currentVersion: settings.version,
        latestVersion: settings.version
    };
    actions = {
        checkForUpdates: async () => {
            try {
                const res = await api.getState();
                const { checkForUpdates } = res.body;

                if (checkForUpdates) {
                    const res = await api.getLatestVersion();
                    const { time, version } = res.body;

                    this.setState({
                        latestVersion: version,
                        latestTime: time
                    });
                }
            } catch (res) {
                // Ignore error
            }
        },
        getCommands: async () => {
            try {
                const res = await api.commands.getCommands();
                const { commands = [] } = res.body;

                this.setState({ commands: commands });
            } catch (res) {
                // Ignore error
            }
        },
        runCommand: async (cmd) => {
            try {
                const res = await api.commands.runCommand({ id: cmd.id });
                const { taskId } = res.body;

                this.setState({
                    commands: this.state.commands.map(c => {
                        return (c.id === cmd.id) ? { ...c, taskId: taskId } : c;
                    })
                });
            } catch (res) {
                // Ignore error
            }
        }
    };
    controllerEvents = {
        'task:run': (taskId) => {
            this.setState({
                runningTasks: this.state.runningTasks.concat(taskId)
            });
        },
        'task:complete': (taskId) => {
            this.setState({
                commands: this.state.commands.map(c => {
                    return (c.taskId === taskId) ? { ...c, taskId: null } : c;
                }),
                runningTasks: without(this.state.runningTasks, taskId)
            });
        },
        'task:error': (taskId) => {
            this.setState({
                commands: this.state.commands.map(c => {
                    return (c.taskId === taskId) ? { ...c, taskId: null } : c;
                }),
                runningTasks: without(this.state.runningTasks, taskId)
            });
        },
        'config:change': () => {
            this.actions.getCommands();
        }
    };

    componentDidMount() {
        this.addControllerEvents();

        // Initial actions
        this.actions.checkForUpdates();
        this.actions.getCommands();
    }
    componentWillUnmount() {
        this.removeControllerEvents();

        this.runningTasks = [];
    }
    addControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
            const callback = this.controllerEvents[eventName];
            controller.on(eventName, callback);
        });
    }
    removeControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
            const callback = this.controllerEvents[eventName];
            controller.off(eventName, callback);
        });
    }
    handleRestoreDefaults() {
        confirm({
            title: i18n._('Restore Defaults'),
            body: i18n._('Are you sure you want to restore the default settings?')
        }).then(() => {
            store.clear();
            window.location.reload();
        });
    }
    render() {
        const { path } = this.props;
        const { commands, runningTasks, currentVersion, latestVersion } = this.state;
        const newUpdateAvailable = semver.lt(currentVersion, latestVersion);
        const tooltip = newUpdateAvailable ? newUpdateAvailableTooltip() : <div />;
        const sessionEnabled = store.get('session.enabled');
        const signedInName = store.get('session.name');
        const hideUserDropdown = !sessionEnabled;

        return (
            <Navbar
                fixedTop
                fluid
                inverse
            >
                <Navbar.Header>
                    <OverlayTrigger
                        overlay={tooltip}
                        placement="right"
                    >
                        <Anchor
                            className="navbar-brand"
                            style={{
                                padding: '10px 15px',
                                position: 'relative'
                            }}
                            href={releases}
                            target="_blank"
                        >
                            {settings.name}
                            <div
                                style={{
                                    fontSize: '50%',
                                    lineHeight: '12px',
                                    textAlign: 'center'
                                }}
                            >
                                {settings.version}
                            </div>
                            {newUpdateAvailable &&
                            <span
                                className="label label-primary"
                                style={{
                                    fontSize: '50%',
                                    position: 'absolute',
                                    top: 2,
                                    right: 2
                                }}
                            >
                                N
                            </span>
                            }
                        </Anchor>
                    </OverlayTrigger>
                    <Navbar.Toggle />
                </Navbar.Header>
                <Navbar.Collapse>
                    <Nav pullRight>
                        <NavDropdown
                            className={classNames(
                                { 'hidden': hideUserDropdown }
                            )}
                            id="nav-dropdown-user"
                            title={<i className="fa fa-fw fa-user" />}
                            noCaret
                        >
                            <MenuItem header>
                                {i18n._('Signed in as {{name}}', { name: signedInName })}
                            </MenuItem>
                            <MenuItem divider />
                            <MenuItem
                                href="#/settings/account"
                            >
                                <i className="fa fa-fw fa-user" />
                                <span className="space" />
                                {i18n._('Account')}
                            </MenuItem>
                            <MenuItem
                                href="#/logout"
                            >
                                <i className="fa fa-fw fa-sign-out" />
                                <span className="space" />
                                {i18n._('Sign Out')}
                            </MenuItem>
                        </NavDropdown>
                        <NavDropdown
                            id="nav-dropdown-menu"
                            title={<i className="fa fa-fw fa-ellipsis-v" />}
                            noCaret
                        >
                            <MenuItem header>
                                {i18n._('Command')}
                            </MenuItem>
                            {commands.map((cmd) => {
                                const isTaskRunning = runningTasks.indexOf(cmd.taskId) >= 0;

                                return (
                                    <MenuItem
                                        key={cmd.id}
                                        disabled={cmd.disabled}
                                        onSelect={() => {
                                            this.actions.runCommand(cmd);
                                        }}
                                    >
                                        <i
                                            className={classNames(
                                                'fa',
                                                'fa-fw',
                                                { 'fa-file-text': !isTaskRunning },
                                                { 'fa-circle-o-notch': isTaskRunning },
                                                { 'fa-spin': isTaskRunning }
                                            )}
                                        />
                                        &nbsp;
                                        {cmd.text}
                                    </MenuItem>
                                );
                            })}
                        </NavDropdown>
                    </Nav>
                    {path === 'workspace' &&
                    <QuickAccessToolbar />
                    }
                </Navbar.Collapse>
            </Navbar>
        );
    }
}

export default Header;
