import classNames from 'classnames';
import i18next from 'i18next';
import isEqual from 'lodash/isEqual';
import React, { Component } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import CSSModules from 'react-css-modules';
import Anchor from '../../components/Anchor';
import Breadcrumb from '../../components/Breadcrumb';
import confirm from '../../lib/confirm';
import i18n from '../../lib/i18n';
import store from '../../store';
import General from './General';
import styles from './index.styl';

@CSSModules(styles, { allowMultiple: true })
class Settings extends Component {
    actions = {
        general: {
            handleRestoreDefaults: (event) => {
                confirm({
                    title: i18n._('Restore Defaults'),
                    body: i18n._('Are you sure you want to restore the default settings?')
                }).then(() => {
                    store.clear();
                    window.location = '/';
                });
            },
            handleCancel: (event) => {
                const defaultState = this.getDefaultState();
                this.setState({ general: defaultState.general });
            },
            handleSave: (event) => {
                const { lang = 'en' } = this.state.general;

                i18next.changeLanguage(lang, (err, t) => {
                    window.location = '/';
                });
            },
            changeLanguage: (lang) => {
                this.setState({
                    general: {
                        ...this.state.general,
                        lang: lang
                    }
                });
            }
        }
    };
    sections = [
        {
            key: 'general',
            title: i18n._('General'),
            component: (props) => <General {...props} />
        }
    ];

    constructor() {
        super();
        this.state = this.getDefaultState();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    getDefaultState() {
        return {
            activeSectionIndex: 0,
            general: {
                lang: i18next.language
            }
        };
    }
    render() {
        const state = {
            ...this.state
        };
        const actions = {
            ...this.actions
        };
        const activeSection = this.sections[state.activeSectionIndex];
        const sectionItems = this.sections.map((section, index) =>
            <li
                key={section.key}
                styleName={classNames(
                    { 'active': activeSection.key === section.key }
                )}
            >
                <Anchor
                    onClick={() => {
                        this.setState({ activeSectionIndex: index });
                    }}
                >
                    {section.title}
                </Anchor>
            </li>
        );
        const defaultState = this.getDefaultState();
        const Component = activeSection.component;
        const componentProps = {
            state: state[activeSection.key],
            stateChanged: !isEqual(state[activeSection.key], defaultState[activeSection.key]),
            actions: actions[activeSection.key]
        };

        return (
            <div {...this.props} styleName="settings">
                <Breadcrumb>
                    <Breadcrumb.Item active>{i18n._('Settings')}</Breadcrumb.Item>
                </Breadcrumb>
                <div styleName="container border">
                    <div styleName="row">
                        <div styleName="col sidenav">
                            <nav styleName="navbar">
                                <ul styleName="nav">
                                    {sectionItems}
                                </ul>
                            </nav>
                        </div>
                        <div styleName="col splitter" />
                        <div styleName="col section">
                            <div styleName="heading">{activeSection.title}</div>
                            <div styleName="content">
                                <Component {...componentProps} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Settings;
