import i18next from 'i18next';
import React from 'react';
import { Navbar, Nav, NavItem, NavDropdown, MenuItem } from 'react-bootstrap';
import settings from '../../config/settings';
import i18n from '../../lib/i18n';
import store from '../../store';
import QuickAccessToolbar from './QuickAccessToolbar';
import confirm from '../../lib/confirm';

const Header = (props) => {
    const handleRestoreDefaults = () => {
        confirm({
            message: i18n._('Restore Defaults'),
            description: i18n._('Are you sure you want to restore the default settings?')
        }, () => {
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
                        <a
                            href={homepage}
                            target="_blank"
                            title={brandTitle}
                        >
                            {settings.name}
                        </a>
                    </Navbar.Brand>
                    <Navbar.Toggle />
                </Navbar.Header>
                <Navbar.Collapse>
                    <Nav>
                        <NavItem href="#/workspace">{i18n._('Workspace')}</NavItem>
                        <NavDropdown title={i18n._('Settings')} id="nav-dropdown">
                            <MenuItem header>{i18n._('Language')}</MenuItem>
                            <MenuItem href="?lang=cs" active={language === 'cs'}>Čeština (Czech)</MenuItem>
                            <MenuItem href="?lang=de" active={language === 'de'}>Deutsch (German)</MenuItem>
                            <MenuItem href="?lang=en" active={language === 'en'}>English</MenuItem>
                            <MenuItem href="?lang=es" active={language === 'es'}>Español (Spanish)</MenuItem>
                            <MenuItem href="?lang=fr" active={language === 'fr'}>Français (French)</MenuItem>
                            <MenuItem href="?lang=it" active={language === 'it'}>Italiano (Italian)</MenuItem>
                            <MenuItem href="?lang=ja" active={language === 'ja'}>日本語 (Japanese)</MenuItem>
                            <MenuItem href="?lang=ru" active={language === 'ru'}>ру́сский язы́к (Russian)</MenuItem>
                            <MenuItem href="?lang=zh-cn" active={language === 'zh-cn'}>简体中文 (Simplified Chinese)</MenuItem>
                            <MenuItem href="?lang=zh-tw" active={language === 'zh-tw'}>繁體中文 (Traditional Chinese)</MenuItem>
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
