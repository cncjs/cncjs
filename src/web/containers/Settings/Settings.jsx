import classNames from 'classnames';
import i18next from 'i18next';
import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import { Link } from 'react-router';
import shallowCompare from 'react-addons-shallow-compare';
import api from '../../api';
import settings from '../../config/settings';
import Breadcrumb from '../../components/Breadcrumb';
import confirm from '../../lib/confirm';
import i18n from '../../lib/i18n';
import store from '../../store';
import General from './General';
import Account from './Account';
import About from './About';
import styles from './index.styl';

const mapPathToSectionKey = (path = '') => {
    return path.split('/')[0] || '';
};

class Settings extends Component {
    static propTypes = {
        path: PropTypes.string
    };
    static defaultProps = {
        path: 'general'
    };

    sections = [
        {
            key: 'general',
            title: i18n._('General'),
            component: (props) => <General {...props} />
        },
        {
            key: 'account',
            title: i18n._('Account'),
            component: (props) => <Account {...props} />
        },
        {
            key: 'about',
            title: i18n._('About'),
            component: (props) => <About {...props} />
        }
    ];
    state = this.getDefaultState();
    actions = {
        // General
        general: {
            handleRestoreDefaults: (event) => {
                confirm({
                    title: i18n._('Restore Defaults'),
                    body: i18n._('Are you sure you want to restore the default settings?')
                }).then(() => {
                    store.clear();
                    window.location.reload();
                });
            },
            handleCancel: (event) => {
                const defaultState = this.getDefaultState();
                this.setState({ general: defaultState.general });
            },
            handleSave: (event) => {
                const { lang = 'en' } = this.state.general;

                i18next.changeLanguage(lang, (err, t) => {
                    if (window.location.search) {
                        // Redirect to the originating page if URL query parameters exist
                        // For example: ?lang=de#/settings
                        window.location.replace(window.location.pathname);
                        return;
                    }

                    window.location.reload();
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
        // Account
        account: {
            fetchData: (options) => {
                const state = this.state.account;
                const {
                    page = state.pagination.page,
                    pageLength = state.pagination.pageLength
                } = { ...options };

                this.setState({
                    account: {
                        ...this.state.account,
                        failure: false,
                        fetching: true
                    }
                });

                api.listUsers({ page, pageLength })
                    .then((res) => {
                        const { pagination, records } = res.body;

                        this.setState({
                            account: {
                                ...this.state.account,
                                failure: false,
                                fetching: false,
                                pagination: {
                                    page: pagination.page,
                                    pageLength: pagination.pageLength,
                                    totalRecords: pagination.totalRecords
                                },
                                records: records
                            }
                        });
                    })
                    .catch((res) => {
                        this.setState({
                            account: {
                                ...this.state.account,
                                failure: true,
                                fetching: false,
                                records: []
                            }
                        });
                    });
            },
            openModal: (modalState = '', modalParams = {}) => {
                this.setState({
                    account: {
                        ...this.state.account,
                        modalState: modalState,
                        modalParams: modalParams
                    }
                });
            },
            closeModal: () => {
                this.setState({
                    account: {
                        ...this.state.account,
                        modalState: '',
                        modalParams: {}
                    }
                });
            },
            updateModalParams: (modalParams = {}) => {
                this.setState({
                    account: {
                        ...this.state.account,
                        modalParams: {
                            ...this.state.account.modalParams,
                            ...modalParams
                        }
                    }
                });
            },
            showModalAlert: (msg) => {
                this.setState({
                    account: {
                        ...this.state.account,
                        modalParams: {
                            ...this.state.account.modalParams,
                            alertMessage: msg
                        }
                    }
                });
            },
            clearModalAlert: () => {
                this.setState({
                    account: {
                        ...this.state.account,
                        modalParams: {
                            ...this.state.account.modalParams,
                            alertMessage: ''
                        }
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
                        if (!this.mounted) {
                            return;
                        }

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
                    .catch(res => {
                        // Ignore error
                    });
            }
        }
    };

    componentDidMount() {
        this.mounted = true;
    }
    componentWillUnmount() {
        this.mounted = false;
    }
    componentWillReceiveProps(nextProps) {
        if (nextProps.path !== this.props.path) {
            this.setState({ path: nextProps.path });
        }
    }
    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    getDefaultState() {
        return {
            path: this.props.path,
            general: {
                lang: i18next.language
            },
            account: {
                failure: false,
                fetching: false,
                pagination: {
                    page: 1,
                    pageLength: 10,
                    totalRecords: 0
                },
                records: [],
                // Modal
                modalState: '',
                modalParams: {
                    alertMessage: '',
                    changePassword: false
                }
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
        const key = mapPathToSectionKey(state.path);
        const activeSection = _.find(this.sections, { key: key }) || this.sections[0];
        const sectionItems = this.sections.map((section, index) =>
            <li
                key={section.key}
                className={classNames(
                    { [styles.active]: activeSection.key === section.key }
                )}
            >
                <Link to={`/settings/${section.key}`}>
                    {section.title}
                </Link>
            </li>
        );
        const defaultState = this.getDefaultState();

        // Section component
        const Section = activeSection.component;
        const sectionState = state[activeSection.key];
        const sectionStateChanged = !_.isEqual(
            state[activeSection.key],
            defaultState[activeSection.key]
        );
        const sectionActions = actions[activeSection.key];

        return (
            <div className={styles.settings}>
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
                                <Section
                                    state={sectionState}
                                    stateChanged={sectionStateChanged}
                                    actions={sectionActions}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Settings;
