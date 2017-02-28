import classNames from 'classnames';
import i18next from 'i18next';
import _ from 'lodash';
import camelCase from 'lodash/camelCase';
import Uri from 'jsuri';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import { Link } from 'react-router';
import api from '../../api';
import settings from '../../config/settings';
import Breadcrumbs from '../../components/Breadcrumbs';
import confirm from '../../lib/confirm';
import i18n from '../../lib/i18n';
import store from '../../store';
import General from './General';
import Account from './Account';
import EventTrigger from './EventTrigger';
import About from './About';
import styles from './index.styl';
import {
    ERR_CONFLICT,
    ERR_PRECONDITION_FAILED
} from '../../api/constants';

const mapPathToSectionId = (path = '') => {
    return camelCase(path.split('/')[0] || '');
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
            id: 'general',
            path: 'general',
            title: i18n._('General'),
            component: (props) => <General {...props} />
        },
        {
            id: 'account',
            path: 'account',
            title: i18n._('Account'),
            component: (props) => <Account {...props} />
        },
        {
            id: 'eventTrigger',
            path: 'event-trigger',
            title: i18n._('Event Trigger'),
            component: (props) => <EventTrigger {...props} />
        },
        {
            id: 'about',
            path: 'about',
            title: i18n._('About'),
            component: (props) => <About {...props} />
        }
    ];
    initialState = this.getDefaultState();
    state = this.getDefaultState();
    actions = {
        // General
        general: {
            load: (options) => {
                this.setState({
                    general: {
                        ...this.state.general,
                        api: {
                            ...this.state.general.api,
                            err: false,
                            loading: true
                        }
                    }
                });

                api.getState()
                    .then((res) => {
                        const { checkForUpdates } = { ...res.body };

                        const nextState = {
                            ...this.state.general,
                            api: {
                                ...this.state.general.api,
                                err: false,
                                loading: false
                            },
                            // followed by data
                            checkForUpdates: !!checkForUpdates,
                            lang: i18next.language
                        };

                        this.initialState.general = nextState;

                        this.setState({ general: nextState });
                    })
                    .catch((res) => {
                        this.setState({
                            general: {
                                ...this.state.general,
                                api: {
                                    ...this.state.general.api,
                                    err: true,
                                    loading: false
                                }
                            }
                        });
                    });
            },
            save: () => {
                const { lang = 'en' } = this.state.general;

                this.setState({
                    general: {
                        ...this.state.general,
                        api: {
                            ...this.state.general.api,
                            err: false,
                            saving: true
                        }
                    }
                });

                const data = {
                    checkForUpdates: this.state.general.checkForUpdates
                };

                api.setState(data)
                    .then((res) => {
                        const nextState = {
                            ...this.state.general,
                            api: {
                                ...this.state.general.api,
                                err: false,
                                saving: false
                            }
                        };

                        // Update settings to initialState
                        this.initialState.general = nextState;

                        this.setState({ general: nextState });
                    })
                    .catch((res) => {
                        this.setState({
                            general: {
                                ...this.state.general,
                                api: {
                                    ...this.state.general.api,
                                    err: true,
                                    saving: false
                                }
                            }
                        });
                    })
                    .then(() => {
                        if (lang === i18next.language) {
                            return;
                        }

                        i18next.changeLanguage(lang, (err, t) => {
                            const uri = new Uri(window.location.search);
                            uri.replaceQueryParam('lang', lang);
                            window.location.search = uri.toString();
                        });
                    });
            },
            restoreSettings: () => {
                // Restore settings from initialState
                this.setState({
                    general: this.initialState.general
                });
            },
            restoreDefaults: (event) => {
                confirm({
                    title: i18n._('Restore Defaults'),
                    body: i18n._('Are you sure you want to restore the default settings?')
                }).then(() => {
                    store.clear();
                    window.location.reload();
                });
            },
            toggleCheckForUpdates: () => {
                const { checkForUpdates } = this.state.general;
                this.setState({
                    general: {
                        ...this.state.general,
                        checkForUpdates: !checkForUpdates
                    }
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
            fetchItems: (options) => {
                const state = this.state.account;
                const {
                    page = state.pagination.page,
                    pageLength = state.pagination.pageLength
                } = { ...options };

                this.setState({
                    account: {
                        ...this.state.account,
                        api: {
                            ...this.state.account.api,
                            err: false,
                            fetching: true
                        }
                    }
                });

                api.users.fetch({ page, pageLength })
                    .then((res) => {
                        const { pagination, records } = res.body;

                        this.setState({
                            account: {
                                ...this.state.account,
                                api: {
                                    ...this.state.account.api,
                                    err: false,
                                    fetching: false
                                },
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
                                api: {
                                    ...this.state.account.api,
                                    err: true,
                                    fetching: false
                                },
                                records: []
                            }
                        });
                    });
            },
            addItem: (options) => {
                const actions = this.actions.account;

                api.users.add(options)
                    .then((res) => {
                        actions.closeModal();
                        actions.fetchItems();
                    })
                    .catch((res) => {
                        const fallbackMsg = i18n._('An unexpected error has occurred.');
                        const msg = {
                            [ERR_CONFLICT]: i18n._('The account name is already being used. Choose another name.')
                        }[res.status] || fallbackMsg;

                        actions.updateModalParams({ alertMessage: msg });
                    });
            },
            updateItem: (id, options) => {
                const actions = this.actions.account;

                api.users.update(id, options)
                    .then((res) => {
                        actions.closeModal();
                        actions.fetchItems();
                    })
                    .catch((res) => {
                        const fallbackMsg = i18n._('An unexpected error has occurred.');
                        const msg = {
                            [ERR_CONFLICT]: i18n._('The account name is already being used. Choose another name.'),
                            [ERR_PRECONDITION_FAILED]: i18n._('Passwords do not match.')
                        }[res.status] || fallbackMsg;

                        actions.updateModalParams({ alertMessage: msg });
                    });
            },
            deleteItem: (id) => {
                const actions = this.actions.account;

                api.users.delete(id)
                    .then((res) => {
                        actions.fetchItems();
                    })
                    .catch((res) => {
                        // Ignore error
                    });
            },
            openModal: (name = '', params = {}) => {
                this.setState({
                    account: {
                        ...this.state.account,
                        modal: {
                            name: name,
                            params: params
                        }
                    }
                });
            },
            closeModal: () => {
                this.setState({
                    account: {
                        ...this.state.account,
                        modal: {
                            name: '',
                            params: {}
                        }
                    }
                });
            },
            updateModalParams: (params = {}) => {
                this.setState({
                    account: {
                        ...this.state.account,
                        modal: {
                            ...this.state.account.modal,
                            params: {
                                ...this.state.account.modal.params,
                                ...params
                            }
                        }
                    }
                });
            }
        },
        // Event Trigger
        eventTrigger: {
            fetchItems: (options) => {
                const state = this.state.eventTrigger;
                const {
                    page = state.pagination.page,
                    pageLength = state.pagination.pageLength
                } = { ...options };

                this.setState({
                    eventTrigger: {
                        ...this.state.eventTrigger,
                        api: {
                            ...this.state.eventTrigger.api,
                            err: false,
                            fetching: true
                        }
                    }
                });

                api.events.fetch({ page, pageLength })
                    .then((res) => {
                        const { pagination, records } = res.body;

                        this.setState({
                            eventTrigger: {
                                ...this.state.eventTrigger,
                                api: {
                                    ...this.state.eventTrigger.api,
                                    err: false,
                                    fetching: false
                                },
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
                            eventTrigger: {
                                ...this.state.eventTrigger,
                                api: {
                                    ...this.state.eventTrigger.api,
                                    err: true,
                                    fetching: false
                                },
                                records: []
                            }
                        });
                    });
            },
            addItem: (options) => {
                const actions = this.actions.eventTrigger;

                api.events.add(options)
                    .then((res) => {
                        actions.closeModal();
                        actions.fetchItems();
                    })
                    .catch((res) => {
                        const fallbackMsg = i18n._('An unexpected error has occurred.');
                        const msg = {
                            // TODO
                        }[res.status] || fallbackMsg;

                        actions.updateModalParams({ alertMessage: msg });
                    });
            },
            updateItem: (id, options) => {
                const actions = this.actions.eventTrigger;

                api.events.update(id, options)
                    .then((res) => {
                        actions.closeModal();

                        const records = this.state.eventTrigger.records;
                        const index = _.findIndex(records, { id: id });

                        if (index >= 0) {
                            records[index] = {
                                ...records[index],
                                ...options
                            };

                            this.setState({
                                eventTrigger: {
                                    ...this.state.eventTrigger,
                                    records: records
                                }
                            });
                        }
                    })
                    .catch((res) => {
                        const fallbackMsg = i18n._('An unexpected error has occurred.');
                        const msg = {
                            // TODO
                        }[res.status] || fallbackMsg;

                        actions.updateModalParams({ alertMessage: msg });
                    });
            },
            deleteItem: (id) => {
                const actions = this.actions.eventTrigger;

                api.events.delete(id)
                    .then((res) => {
                        actions.fetchItems();
                    })
                    .catch((res) => {
                        // Ignore error
                    });
            },
            openModal: (name = '', params = {}) => {
                this.setState({
                    eventTrigger: {
                        ...this.state.eventTrigger,
                        modal: {
                            name: name,
                            params: params
                        }
                    }
                });
            },
            closeModal: () => {
                this.setState({
                    eventTrigger: {
                        ...this.state.eventTrigger,
                        modal: {
                            name: '',
                            params: {}
                        }
                    }
                });
            },
            updateModalParams: (params = {}) => {
                this.setState({
                    eventTrigger: {
                        ...this.state.eventTrigger,
                        modal: {
                            ...this.state.eventTrigger.modal,
                            params: {
                                ...this.state.eventTrigger.modal.params,
                                ...params
                            }
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
                // followed by api state
                api: {
                    err: false,
                    loading: true, // defaults to true
                    saving: false
                },
                // followed by data
                checkForUpdates: true,
                lang: i18next.language
            },
            account: {
                // followed by api state
                api: {
                    err: false,
                    fetching: false
                },
                // followed by data
                pagination: {
                    page: 1,
                    pageLength: 10,
                    totalRecords: 0
                },
                records: [],
                // Modal
                modal: {
                    name: '',
                    params: {
                        alertMessage: '',
                        changePassword: false
                    }
                }
            },
            eventTrigger: {
                // followed by api state
                api: {
                    err: false,
                    fetching: false
                },
                // followed by data
                pagination: {
                    page: 1,
                    pageLength: 10,
                    totalRecords: 0
                },
                records: [],
                // Modal
                modal: {
                    name: '',
                    params: {
                    }
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
        const id = mapPathToSectionId(state.path);
        const activeSection = _.find(this.sections, { id: id }) || this.sections[0];
        const sectionItems = this.sections.map((section, index) =>
            <li
                key={section.id}
                className={classNames(
                    { [styles.active]: activeSection.id === section.id }
                )}
            >
                <Link to={`/settings/${section.path}`}>
                    {section.title}
                </Link>
            </li>
        );

        // Section component
        const Section = activeSection.component;
        const sectionInitialState = this.initialState[activeSection.id];
        const sectionState = state[activeSection.id];
        const sectionStateChanged = !_.isEqual(sectionInitialState, sectionState);
        const sectionActions = actions[activeSection.id];

        return (
            <div className={styles.settings}>
                <Breadcrumbs>
                    <Breadcrumbs.Item active>{i18n._('Settings')}</Breadcrumbs.Item>
                </Breadcrumbs>
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
                                    initialState={sectionInitialState}
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
