import i18n from 'i18next';
import React from 'react';
import settings from '../../config/settings';
import { Link } from 'react-router';
import { Navbar, Nav, NavItem, NavDropdown, MenuItem } from 'react-bootstrap';

export default class Header extends React.Component {
    render() {
        let homepage = 'https://github.com/cheton/cnc.js';
        let brand = <a href={homepage} target="_blank">{settings.name}</a>;
        let lng = i18n.lng();

        return (
            <div data-component="Header">
                <Navbar brand={brand} fixedTop fluid inverse>
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
                </Navbar>
            </div>
        );
    }
}
