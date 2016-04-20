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
                        <a href={homepage} target="_blank" title={brandTitle}>{settings.name}</a>
                    </Navbar.Brand>
                    <Navbar.Toggle />
                </Navbar.Header>
                <Navbar.Collapse>
                    <Nav>
                        <NavItem href="#/workspace">{i18n._('Workspace')}</NavItem>
                        <NavDropdown title={i18n._('Settings')} id="nav-dropdown">
                            <MenuItem header>{i18n._('Language')}</MenuItem>
                            <MenuItem href="?lang=de" active={language === 'de'}>Deutsch</MenuItem>
                            <MenuItem href="?lang=en" active={language === 'en'}>English (US)</MenuItem>
                            <MenuItem href="?lang=es" active={language === 'es'}>Español</MenuItem>
                            <MenuItem href="?lang=fr" active={language === 'fr'}>Français</MenuItem>
                            <MenuItem href="?lang=it" active={language === 'it'}>Italiano</MenuItem>
                            <MenuItem href="?lang=ja" active={language === 'ja'}>日本語</MenuItem>
                            <MenuItem href="?lang=zh-cn" active={language === 'zh-cn'}>中文 (简体)</MenuItem>
                            <MenuItem href="?lang=zh-tw" active={language === 'zh-tw'}>中文 (繁體)</MenuItem>
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
