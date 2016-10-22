import i18next from 'i18next';
import React, { Component, PropTypes } from 'react';
import { Navbar, Nav, NavItem, NavDropdown, MenuItem } from 'react-bootstrap';
import CSSModules from 'react-css-modules';
import semver from 'semver';
import settings from '../../config/settings';
import api from '../../api';
import i18n from '../../lib/i18n';
import store from '../../store';
import QuickAccessToolbar from './QuickAccessToolbar';
import confirm from '../../lib/confirm';
import Anchor from '../../components/Anchor';
import styles from './index.styl';

@CSSModules(styles)
class Header extends Component {
    static propTypes = {
        path: PropTypes.string
    };

    componentDidMount() {
        api.getLatestVersion()
            .then((res) => {
                const { version } = res.body;
                if (semver.lt(settings.version, version)) {
                    // New Version Available
                }
            })
            .catch((err) => {
                // Ignore error
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
        const homepage = 'https://github.com/cheton/cnc';
        //const wiki = 'https://github.com/cheton/cnc/wiki';
        const language = i18next.language;
        const brandTitle = settings.name + ' v' + settings.version;

        return (
            <Navbar fixedTop fluid inverse>
                <Navbar.Header>
                    <Navbar.Brand>
                        <Anchor
                            href={homepage}
                            target="_blank"
                            title={brandTitle}
                        >
                            {settings.name}
                        </Anchor>
                    </Navbar.Brand>
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
