import classNames from 'classnames';
import i18next from 'i18next';
import camelCase from 'lodash/camelCase';
import find from 'lodash/find';
import findIndex from 'lodash/findIndex';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import Uri from 'jsuri';
import React, { PureComponent } from 'react';
import { Link, withRouter } from 'react-router-dom';
import api from 'app/api';
import {
    ERR_CONFLICT,
    ERR_PRECONDITION_FAILED
} from 'app/api/constants';
import settings from 'app/config/settings';
import Breadcrumbs from 'app/components/Breadcrumbs';
import i18n from 'app/lib/i18n';
import General from './General';
import Workspace from './Workspace';
import Account from './Account';
import Controller from './Controller';
import Commands from './Commands';
import Events from './Events';
import About from './About';
import styles from './index.styl';

const mapSectionPathToId = (path = '') => {
    return camelCase(path.split('/')[0] || '');
};

class Settings extends PureComponent {
    static propTypes = {
        ...withRouter.propTypes
    };

    sections = [
        {
            id: 'general',
            path: 'general',
            title: i18n._('General'),
            component: (props) => <General {...props} />
        },
        {
            id: 'workspace',
            path: 'workspace',
            title: i18n._('Workspace'),
            component: (props) => <Workspace {...props} />
        },
        {
            id: 'controller',
            path: 'controller',
            title: i18n._('Controller'),
            component: (props) => <Controller {...props} />
        },
        {
            id: 'account',
            path: 'account',
            title: i18n._('My Account'),
            component: (props) => <Account {...props} />
        },
        {
            id: 'commands',
            path: 'commands',
            title: i18n._('Commands'),
            component: (props) => <Commands {...props} />
        },
        {
            id: 'events',
            path: 'events',
            title: i18n._('Events'),
            component: (props) => <Events {...props} />
        },
        {
            id: 'about',
            path: 'about',
            title: i18n._('About'),
            component: (props) => <About {...props} />
        }
    ];
    initialState = this.getInitialState();
    state = this.getInitialState();
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
        // Workspace
        workspace: {
            openModal: (name = '', params = {}) => {
                this.setState({
                    workspace: {
                        ...this.state.workspace,
                        modal: {
                            name: name,
                            params: params
                        }
                    }
                });
            },
            closeModal: () => {
                this.setState({
                    workspace: {
                        ...this.state.workspace,
                        modal: {
                            name: '',
                            params: {}
                        }
                    }
                });
            }
        },
        // Controller
        controller: {
            load: (options) => {
                this.setState(state => ({
                    controller: {
                        ...state.controller,
                        api: {
                            ...state.controller.api,
                            err: false,
                            loading: true
                        }
                    }
                }));

                api.getState().then((res) => {
                    const ignoreErrors = get(res.body, 'controller.exception.ignoreErrors');

                    const nextState = {
                        ...this.state.controller,
                        api: {
                            ...this.state.controller.api,
                            err: false,
                            loading: false
                        },
                        // followed by data
                        ignoreErrors: !!ignoreErrors
                    };

                    this.initialState.controller = nextState;

                    this.setState({ controller: nextState });
                }).catch((res) => {
                    this.setState(state => ({
                        controller: {
                            ...state.controller,
                            api: {
                                ...state.controller.api,
                                err: true,
                                loading: false
                            }
                        }
                    }));
                });
            },
            save: () => {
                this.setState(state => ({
                    controller: {
                        ...state.controller,
                        api: {
                            ...state.controller.api,
                            err: false,
                            saving: true
                        }
                    }
                }));

                const data = {
                    controller: {
                        exception: {
                            ignoreErrors: this.state.controller.ignoreErrors
                        }
                    }
                };

                api.setState(data).then((res) => {
                    const nextState = {
                        ...this.state.controller,
                        api: {
                            ...this.state.controller.api,
                            err: false,
                            saving: false
                        }
                    };

                    // Update settings to initialState
                    this.initialState.controller = nextState;

                    this.setState({ controller: nextState });
                }).catch((res) => {
                    this.setState(state => ({
                        controller: {
                            ...state.controller,
                            api: {
                                ...state.controller.api,
                                err: true,
                                saving: false
                            }
                        }
                    }));
                });
            },
            restoreSettings: () => {
                // Restore settings from initialState
                this.setState({
                    controller: this.initialState.controller
                });
            },
            toggleIgnoreErrors: () => {
                this.setState(state => ({
                    controller: {
                        ...state.controller,
                        ignoreErrors: !state.controller.ignoreErrors
                    }
                }));
            }
        },
        // My Account
        account: {
            fetchRecords: (options) => {
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

                api.users.fetch({ paging: true, page, pageLength })
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
            createRecord: (options) => {
                const actions = this.actions.account;

                api.users.create(options)
                    .then((res) => {
                        actions.closeModal();
                        actions.fetchRecords();
                    })
                    .catch((res) => {
                        const fallbackMsg = i18n._('An unexpected error has occurred.');
                        const msg = {
                            [ERR_CONFLICT]: i18n._('The account name is already being used. Choose another name.')
                        }[res.status] || fallbackMsg;

                        actions.updateModalParams({ alertMessage: msg });
                    });
            },
            updateRecord: (id, options, forceReload = false) => {
                const actions = this.actions.account;

                api.users.update(id, options)
                    .then((res) => {
                        actions.closeModal();

                        if (forceReload) {
                            actions.fetchRecords();
                            return;
                        }

                        const records = this.state.account.records;
                        const index = findIndex(records, { id: id });

                        if (index >= 0) {
                            records[index] = {
                                ...records[index],
                                ...options
                            };

                            this.setState({
                                account: {
                                    ...this.state.account,
                                    records: records
                                }
                            });
                        }
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
            deleteRecord: (id) => {
                const actions = this.actions.account;

                api.users.delete(id)
                    .then((res) => {
                        actions.fetchRecords();
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
        // Commands
        commands: {
            fetchRecords: (options) => {
                const state = this.state.commands;
                const {
                    page = state.pagination.page,
                    pageLength = state.pagination.pageLength
                } = { ...options };

                this.setState({
                    commands: {
                        ...this.state.commands,
                        api: {
                            ...this.state.commands.api,
                            err: false,
                            fetching: true
                        }
                    }
                });

                api.commands.fetch({ paging: true, page, pageLength })
                    .then((res) => {
                        const { pagination, records } = res.body;

                        this.setState({
                            commands: {
                                ...this.state.commands,
                                api: {
                                    ...this.state.commands.api,
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
                            commands: {
                                ...this.state.commands,
                                api: {
                                    ...this.state.commands.api,
                                    err: true,
                                    fetching: false
                                },
                                records: []
                            }
                        });
                    });
            },
            createRecord: (options) => {
                const actions = this.actions.commands;

                api.commands.create(options)
                    .then((res) => {
                        actions.closeModal();
                        actions.fetchRecords();
                    })
                    .catch((res) => {
                        const fallbackMsg = i18n._('An unexpected error has occurred.');
                        const msg = {
                            // TODO
                        }[res.status] || fallbackMsg;

                        actions.updateModalParams({ alertMessage: msg });
                    });
            },
            updateRecord: (id, options, forceReload = false) => {
                const actions = this.actions.commands;

                api.commands.update(id, options)
                    .then((res) => {
                        actions.closeModal();

                        if (forceReload) {
                            actions.fetchRecords();
                            return;
                        }

                        const records = this.state.commands.records;
                        const index = findIndex(records, { id: id });

                        if (index >= 0) {
                            records[index] = {
                                ...records[index],
                                ...options
                            };

                            this.setState({
                                commands: {
                                    ...this.state.commands,
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
            deleteRecord: (id) => {
                const actions = this.actions.commands;

                api.commands.delete(id)
                    .then((res) => {
                        actions.fetchRecords();
                    })
                    .catch((res) => {
                        // Ignore error
                    });
            },
            openModal: (name = '', params = {}) => {
                this.setState({
                    commands: {
                        ...this.state.commands,
                        modal: {
                            name: name,
                            params: params
                        }
                    }
                });
            },
            closeModal: () => {
                this.setState({
                    commands: {
                        ...this.state.commands,
                        modal: {
                            name: '',
                            params: {}
                        }
                    }
                });
            },
            updateModalParams: (params = {}) => {
                this.setState({
                    commands: {
                        ...this.state.commands,
                        modal: {
                            ...this.state.commands.modal,
                            params: {
                                ...this.state.commands.modal.params,
                                ...params
                            }
                        }
                    }
                });
            }
        },
        // Events
        events: {
            fetchRecords: (options) => {
                const state = this.state.events;
                const {
                    page = state.pagination.page,
                    pageLength = state.pagination.pageLength
                } = { ...options };

                this.setState({
                    events: {
                        ...this.state.events,
                        api: {
                            ...this.state.events.api,
                            err: false,
                            fetching: true
                        }
                    }
                });

                api.events.fetch({ paging: true, page, pageLength })
                    .then((res) => {
                        const { pagination, records } = res.body;

                        this.setState({
                            events: {
                                ...this.state.events,
                                api: {
                                    ...this.state.events.api,
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
                            events: {
                                ...this.state.events,
                                api: {
                                    ...this.state.events.api,
                                    err: true,
                                    fetching: false
                                },
                                records: []
                            }
                        });
                    });
            },
            createRecord: (options) => {
                const actions = this.actions.events;

                api.events.create(options)
                    .then((res) => {
                        actions.closeModal();
                        actions.fetchRecords();
                    })
                    .catch((res) => {
                        const fallbackMsg = i18n._('An unexpected error has occurred.');
                        const msg = {
                            // TODO
                        }[res.status] || fallbackMsg;

                        actions.updateModalParams({ alertMessage: msg });
                    });
            },
            updateRecord: (id, options, forceReload = false) => {
                const actions = this.actions.events;

                api.events.update(id, options)
                    .then((res) => {
                        actions.closeModal();

                        if (forceReload) {
                            actions.fetchRecords();
                            return;
                        }

                        const records = this.state.events.records;
                        const index = findIndex(records, { id: id });

                        if (index >= 0) {
                            records[index] = {
                                ...records[index],
                                ...options
                            };

                            this.setState({
                                events: {
                                    ...this.state.events,
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
            deleteRecord: (id) => {
                const actions = this.actions.events;

                api.events.delete(id)
                    .then((res) => {
                        actions.fetchRecords();
                    })
                    .catch((res) => {
                        // Ignore error
                    });
            },
            openModal: (name = '', params = {}) => {
                this.setState({
                    events: {
                        ...this.state.events,
                        modal: {
                            name: name,
                            params: params
                        }
                    }
                });
            },
            closeModal: () => {
                this.setState({
                    events: {
                        ...this.state.events,
                        modal: {
                            name: '',
                            params: {}
                        }
                    }
                });
            },
            updateModalParams: (params = {}) => {
                this.setState({
                    events: {
                        ...this.state.events,
                        modal: {
                            ...this.state.events.modal,
                            params: {
                                ...this.state.events.modal.params,
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
    getInitialState() {
        return {
            // General
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
            // Workspace
            workspace: {
                // Modal
                modal: {
                    name: '',
                    params: {
                    }
                }
            },
            // My Account
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
            // Controller
            controller: {
                // followed by api state
                api: {
                    err: false,
                    loading: true, // defaults to true
                    saving: false
                },
                // followed by data
                ignoreErrors: false
            },
            // Commands
            commands: {
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
            // Events
            events: {
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
            // About
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
        const { pathname = '' } = this.props.location;
        const initialSectionPath = this.sections[0].path;
        const sectionPath = pathname.replace(/^\/settings(\/)?/, ''); // TODO
        const id = mapSectionPathToId(sectionPath || initialSectionPath);
        const activeSection = find(this.sections, { id: id }) || this.sections[0];
        const sectionItems = this.sections.map((section, index) => (
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
        ));

        // Section component
        const Section = activeSection.component;
        const sectionInitialState = this.initialState[activeSection.id];
        const sectionState = state[activeSection.id];
        const sectionStateChanged = !isEqual(sectionInitialState, sectionState);
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

export default withRouter(Settings);
