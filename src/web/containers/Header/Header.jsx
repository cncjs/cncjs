import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import { Nav, Navbar, NavDropdown, MenuItem, OverlayTrigger, Tooltip } from 'react-bootstrap';
import semver from 'semver';
import api from '../../api';
import Anchor from '../../components/Anchor';
import settings from '../../config/settings';
import confirm from '../../lib/confirm';
import i18n from '../../lib/i18n';
import store from '../../store';
import QuickAccessToolbar from './QuickAccessToolbar';

const releases = 'https://github.com/cheton/cnc/releases';

const newUpdateAvailableTooltip = (currentVersion) => {
    return (
        <Tooltip
            id="navbarBrandTooltip"
            style={{ color: '#fff' }}
        >
            <div>{i18n._('New update available')}</div>
        </Tooltip>
    );
};

const uptodateVersionTooltip = (currentVersion) => {
    return (
        <Tooltip
            id="navbarBrandTooltip"
            style={{ color: '#fff' }}
        >
            <div>cnc {currentVersion}</div>
        </Tooltip>
    );
};

class Header extends Component {
    static propTypes = {
        path: PropTypes.string
    };

    constructor() {
        super();
        this.state = this.getDefaultState();
    }
    componentDidMount() {
        api.getLatestVersion()
            .then((res) => {
                const { time, version } = res.body;
                this.setState({
                    latestVersion: version,
                    latestTime: time
                });
            })
            .catch((res) => {
                // Ignore error
            });
    }
    getDefaultState() {
        return {
            currentVersion: settings.version,
            latestVersion: settings.version
        };
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
        const { currentVersion, latestVersion } = this.state;
        const newUpdateAvailable = semver.lt(currentVersion, latestVersion);
        const tooltip = newUpdateAvailable
            ? newUpdateAvailableTooltip(currentVersion)
            : uptodateVersionTooltip(currentVersion);
        const sessionEnabled = store.get('session.enabled');
        const signedInName = store.get('session.name');

        return (
            <Navbar fixedTop fluid inverse>
                <Navbar.Header>
                    <OverlayTrigger
                        overlay={tooltip}
                        placement="right"
                    >
                        <Anchor
                            className="navbar-brand"
                            href={releases}
                            target="_blank"
                        >
                            {settings.name}
                            {newUpdateAvailable &&
                            <span
                                className="label label-primary"
                                style={{
                                    position: 'absolute',
                                    top: 5,
                                    fontSize: '50%'
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
                    <Nav
                        className={classNames(
                            { 'hidden': !sessionEnabled }
                        )}
                        pullRight
                    >
                        <NavDropdown
                            id="nav-dropdown-user"
                            title={<i className="fa fa-user" style={{ fontSize: 16 }} />}
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
