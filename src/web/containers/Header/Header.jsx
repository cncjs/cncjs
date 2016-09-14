import i18next from 'i18next';
import React from 'react';
import { Navbar, Nav, NavItem, NavDropdown, MenuItem } from 'react-bootstrap';
import settings from '../../config/settings';
import i18n from '../../lib/i18n';
import store from '../../store';
import QuickAccessToolbar from './QuickAccessToolbar';
import confirm from '../../lib/confirm';
import Anchor from '../../components/Anchor';

const Header = (props) => {
    const handleRestoreDefaults = () => {
        confirm({
            title: i18n._('Restore Defaults'),
            body: i18n._('Are you sure you want to restore the default settings?')
        }).then(() => {
            store.clear();
            window.location.reload();
        });
    };

    const homepage = 'https://github.com/cheton/cnc';
    const language = i18next.language;
    const brandTitle = settings.name + ' v' + settings.version;

    return (
        <div className="header" data-ns="header">
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
                    <Nav>
                        <NavItem
                            eventKey={1}
                            href="#/workspace"
                        >
                            {i18n._('Workspace')}
                        </NavItem>
                        <NavDropdown
                            eventKey={2}
                            title={i18n._('Settings')}
                            id="nav-dropdown"
                        >
                            <MenuItem header>{i18n._('Language')}</MenuItem>
                            <MenuItem
                                href="?lang=cs"
                                active={language === 'cs'}
                                title="Czech"
                            >
                                Čeština
                            </MenuItem>
                            <MenuItem
                                href="?lang=de"
                                active={language === 'de'}
                                title="German"
                            >
                                Deutsch
                            </MenuItem>
                            <MenuItem
                                href="?lang=en"
                                active={language === 'en'}
                                title="English"
                            >
                                English (US)
                            </MenuItem>
                            <MenuItem
                                href="?lang=es"
                                active={language === 'es'}
                                title="Spanish"
                            >
                                Español
                            </MenuItem>
                            <MenuItem
                                href="?lang=fr"
                                active={language === 'fr'}
                                title="French"
                            >
                                Français
                            </MenuItem>
                            <MenuItem
                                href="?lang=it"
                                active={language === 'it'}
                                title="Italian"
                            >
                                Italiano
                            </MenuItem>
                            <MenuItem
                                href="?lang=ja"
                                active={language === 'ja'}
                                title="Japanese"
                            >
                                日本語
                            </MenuItem>
                            <MenuItem
                                href="?lang=pt-br"
                                active={language === 'pt-br'}
                                title="Portuguese (Brazil)"
                            >
                                Português (Brasil)
                            </MenuItem>
                            <MenuItem
                                href="?lang=ru"
                                active={language === 'ru'}
                                title="Russian"
                            >
                                ру́сский язы́к
                            </MenuItem>
                            <MenuItem
                                href="?lang=zh-cn"
                                active={language === 'zh-cn'}
                                title="Simplified Chinese"
                            >
                                简体中文
                            </MenuItem>
                            <MenuItem
                                href="?lang=zh-tw"
                                active={language === 'zh-tw'}
                                title="Traditional Chinese"
                            >
                                繁體中文
                            </MenuItem>
                            <MenuItem divider />
                            <MenuItem onSelect={handleRestoreDefaults}>
                                {i18n._('Restore Defaults')}
                            </MenuItem>
                        </NavDropdown>
                    </Nav>
                    <QuickAccessToolbar />
                </Navbar.Collapse>
            </Navbar>
        </div>
    );
};

export default Header;
