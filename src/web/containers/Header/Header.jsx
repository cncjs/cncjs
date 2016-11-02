import React, { Component, PropTypes } from 'react';
import { Navbar, OverlayTrigger, Tooltip } from 'react-bootstrap';
import semver from 'semver';
import settings from '../../config/settings';
import api from '../../api';
import i18n from '../../lib/i18n';
import store from '../../store';
import QuickAccessToolbar from './QuickAccessToolbar';
import confirm from '../../lib/confirm';
import Anchor from '../../components/Anchor';

const releases = 'https://github.com/cheton/cnc/releases';

const newUpdateAvailableTooltip = (currentVersion) => {
    return (
        <Tooltip
            id="navbarBrandTooltip"
            style={{ color: '#fff' }}
        >
            <div>cnc {currentVersion}</div>
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
            .catch((err) => {
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
                    {path === 'workspace' &&
                    <QuickAccessToolbar />
                    }
                </Navbar.Collapse>
            </Navbar>
        );
    }
}

export default Header;
