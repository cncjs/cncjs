import classNames from 'classnames';
import i18next from 'i18next';
import isEqual from 'lodash/isEqual';
import React, { Component } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import api from '../../api';
import settings from '../../config/settings';
import Anchor from '../../components/Anchor';
import Breadcrumb from '../../components/Breadcrumb';
import confirm from '../../lib/confirm';
import i18n from '../../lib/i18n';
import store from '../../store';
import General from './General';
import About from './About';
import styles from './index.styl';

class Settings extends Component {
    actions = {
        // General
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
        },
        // About
        about: {
            checkLatestVersion: () => {
                this.setState({
                    about: {
                        ...this.state.about,
                        version: {
                            ...this.state.about.version,
                            checking: true
                        }
                    }
                });

                api.getLatestVersion()
                    .then((res) => {
                        const { version, time } = res.body;
                        this.setState({
                            about: {
                                ...this.state.about,
                                version: {
                                    ...this.state.about.version,
                                    checking: false,
                                    latest: version,
                                    lastUpdate: time
                                }
                            }
                        });
                    })
                    .catch((err) => {
                        // Ignore error
                    });
            }
        }
    };
    sections = [
        {
            key: 'general',
            title: i18n._('General'),
            component: (props) => <General {...props} />
        },
        /*
        {
            key: 'account',
            title: i18n._('My Account'),
            component: (props) => <Account {...props} />
        },
        */
        {
            key: 'about',
            title: i18n._('About'),
            component: (props) => <About {...props} />
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
            },
            about: {
                version: {
                    checking: false,
                    current: settings.version,
                    latest: settings.version,
                    lastUpdate: ''
                }
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
                className={classNames(
                    { [styles.active]: activeSection.key === section.key }
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
            <div {...this.props} className={styles.settings}>
                <Breadcrumb>
                    <Breadcrumb.Item active>{i18n._('Settings')}</Breadcrumb.Item>
                </Breadcrumb>
                <div className={classNames(styles.container, styles.border)}>
                    <div className={styles.row}>
                        <div className={classNames(styles.col, styles.sidenav)}>
                            <nav className={styles.navbar}>
                                <ul className={styles.nav}>
                                    {sectionItems}
                                </ul>
                            </nav>
                        </div>
                        <div className={classNames(styles.col, styles.splitter)} />
                        <div className={classNames(styles.col, styles.section)}>
                            <div className={styles.heading}>{activeSection.title}</div>
                            <div className={styles.content}>
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
