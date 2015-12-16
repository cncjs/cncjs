import i18n from 'i18next';
import React from 'react';
import { Navbar, NavbarBrand, Nav, NavItem, NavDropdown, MenuItem } from 'react-bootstrap';
import settings from '../../config/settings';
import GrblQuickAccessToolbar from './GrblQuickAccessToolbar';

class Header extends React.Component {
    render() {
        let homepage = 'https://github.com/cheton/cnc.js';
        let lng = i18n.lng();

        return (
            <div data-component="Header">
                <Navbar fixedTop fluid inverse>
                    <NavbarBrand>
                        <a href={homepage} target="_blank">{settings.name}</a>
                    </NavbarBrand>
                    <Nav>
                        <NavItem href="#/workspace">{i18n._('Workspace')}</NavItem>
                        <NavDropdown title={i18n._('Settings')} id="nav-dropdown">
                            <MenuItem header>{i18n._('Language')}</MenuItem>
                            <MenuItem href="?lang=de" active={lng === 'de'}>Deutsch</MenuItem>
                            <MenuItem href="?lang=en" active={lng === 'en'}>English (US)</MenuItem>
                            <MenuItem href="?lang=es" active={lng === 'es'}>Español</MenuItem>
                            <MenuItem href="?lang=fr" active={lng === 'fr'}>Français</MenuItem>
                            <MenuItem href="?lang=it" active={lng === 'it'}>Italiano</MenuItem>
                            <MenuItem href="?lang=ja" active={lng === 'ja'}>日本語</MenuItem>
                            <MenuItem href="?lang=zh-cn" active={lng === 'zh-cn'}>中文 (简体)</MenuItem>
                            <MenuItem href="?lang=zh-tw" active={lng === 'zh-tw'}>中文 (繁體)</MenuItem>
                        </NavDropdown>
                    </Nav>
                    <div className="pull-right">
                        <GrblQuickAccessToolbar />
                    </div>
                </Navbar>
            </div>
        );
    }
}

export default Header;
