import { ensureArray } from 'ensure-type';
import i18next from 'i18next';
import Uri from 'jsuri';
import _camelCase from 'lodash/camelCase';
import _find from 'lodash/find';
import _findIndex from 'lodash/findIndex';
import _get from 'lodash/get';
import _isEqual from 'lodash/isEqual';
import pubsub from 'pubsub-js';
import React, { Component } from 'react';
import api from 'app/api';
import {
  ERR_CONFLICT,
  ERR_PRECONDITION_FAILED
} from 'app/api/constants';
import withRouter from 'app/components/withRouter'; // withRouter is deprecated
import i18n from 'app/lib/i18n';
import config from 'app/store/config';
import GeneralSettings from './GeneralSettings';
import WorkspaceSettings from './WorkspaceSettings';
import MachineProfiles from './MachineProfiles';
import UserAccounts from './UserAccounts';
import Commands from './Commands';
import Events from './Events';

const mapSectionPathToId = (path = '') => {
  return _camelCase(path.split('/')[0] || '');
};

class Administration extends Component {
  static propTypes = {
    ...withRouter.propTypes
  };

  sections = [
    {
      id: 'generalSettings',
      path: 'general-settings',
      title: i18n._('General Settings'),
      component: (props) => <GeneralSettings {...props} />
    },
    {
      id: 'workspaceSettings',
      path: 'workspace-settings',
      title: i18n._('Workspace Settings'),
      component: (props) => <WorkspaceSettings {...props} />
    },
    {
      id: 'machineProfiles',
      path: 'machine-profiles',
      title: i18n._('Machine Profiles'),
      component: (props) => <MachineProfiles {...props} />
    },
    {
      id: 'userAccounts',
      path: 'user-accounts',
      title: i18n._('User Accounts'),
      component: (props) => <UserAccounts {...props} />
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
  ];

  initialState = this.getInitialState();

  state = this.getInitialState();

  actions = {
    // General Settings
    generalSettings: {
      load: (options) => {
        this.setState({
          generalSettings: {
            ...this.state.generalSettings,
            api: {
              ...this.state.generalSettings.api,
              err: false,
              loading: true
            }
          }
        });

        api.getState()
          .then((res) => {
            const { checkForUpdates } = { ...res.body };

            const nextState = {
              ...this.state.generalSettings,
              api: {
                ...this.state.generalSettings.api,
                err: false,
                loading: false
              },
              // followed by data
              checkForUpdates: !!checkForUpdates,
              lang: i18next.language
            };

            this.initialState.generalSettings = nextState;

            this.setState({ generalSettings: nextState });
          })
          .catch((res) => {
            this.setState({
              generalSettings: {
                ...this.state.generalSettings,
                api: {
                  ...this.state.generalSettings.api,
                  err: true,
                  loading: false
                }
              }
            });
          });
      },
      save: () => {
        const { lang = 'en' } = this.state.generalSettings;

        this.setState({
          generalSettings: {
            ...this.state.generalSettings,
            api: {
              ...this.state.generalSettings.api,
              err: false,
              saving: true
            }
          }
        });

        const data = {
          checkForUpdates: this.state.generalSettings.checkForUpdates
        };

        api.setState(data)
          .then((res) => {
            const nextState = {
              ...this.state.generalSettings,
              api: {
                ...this.state.generalSettings.api,
                err: false,
                saving: false
              }
            };

            // Update settings to initialState
            this.initialState.generalSettings = nextState;

            this.setState({ generalSettings: nextState });
          })
          .catch((res) => {
            this.setState({
              generalSettings: {
                ...this.state.generalSettings,
                api: {
                  ...this.state.generalSettings.api,
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
          generalSettings: this.initialState.generalSettings,
        });
      },
      toggleCheckForUpdates: () => {
        const { checkForUpdates } = this.state.generalSettings;
        this.setState({
          generalSettings: {
            ...this.state.generalSettings,
            checkForUpdates: !checkForUpdates
          }
        });
      },
      changeLanguage: (lang) => {
        this.setState({
          generalSettings: {
            ...this.state.generalSettings,
            lang: lang
          }
        });
      }
    },

    // Machine Profiles
    machineProfiles: {
      fetchRecords: (options) => {
        const state = this.state.machineProfiles;
        const {
          page = state.pagination.page,
          pageLength = state.pagination.pageLength
        } = { ...options };

        this.setState({
          machineProfiles: {
            ...this.state.machineProfiles,
            api: {
              ...this.state.machineProfiles.api,
              err: false,
              fetching: true
            }
          }
        });

        api.machines.fetch({ paging: true, page, pageLength })
          .then((res) => {
            const { pagination, records } = res.body;

            this.setState({
              machineProfiles: {
                ...this.state.machineProfiles,
                api: {
                  ...this.state.machineProfiles.api,
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

            // FIXME: Use redux store
            const machineProfiles = ensureArray(records);
            pubsub.publish('updateMachineProfiles', machineProfiles);
          })
          .catch((res) => {
            this.setState({
              machineProfiles: {
                ...this.state.machineProfiles,
                api: {
                  ...this.state.machineProfiles.api,
                  err: true,
                  fetching: false
                },
                records: []
              }
            });
          });
      },
      createRecord: (options) => {
        const actions = this.actions.machineProfiles;

        api.machines.create(options)
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
        const actions = this.actions.machineProfiles;

        api.machines.update(id, options)
          .then((res) => {
            actions.closeModal();

            if (forceReload) {
              actions.fetchRecords();
              return;
            }

            const records = [...this.state.machineProfiles.records];
            const index = _findIndex(records, { id: id });

            if (index >= 0) {
              records[index] = {
                ...records[index],
                ...options
              };

              this.setState({
                machineProfiles: {
                  ...this.state.machineProfiles,
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
          })
          .then(() => {
            try {
              // Fetch machine profiles
              api.machines.fetch()
                .then(res => {
                  const { records: machineProfiles } = res.body;
                  return ensureArray(machineProfiles);
                })
                .then(machineProfiles => {
                  // Update matched machine profile
                  const currentMachineProfile = config.get('workspace.machineProfile');
                  const currentMachineProfileId = _get(currentMachineProfile, 'id');
                  const matchedMachineProfile = _find(machineProfiles, { id: currentMachineProfileId });

                  if (matchedMachineProfile) {
                    config.set('workspace.machineProfile', matchedMachineProfile);
                  }
                });
            } catch (err) {
              // Ignore
            }
          });
      },
      deleteRecord: (id) => {
        const actions = this.actions.machineProfiles;

        api.machines.delete(id)
          .then((res) => {
            actions.fetchRecords();
          })
          .catch((res) => {
            // Ignore error
          })
          .then(() => {
            try {
              // Fetch machine profiles
              api.machines.fetch()
                .then(res => {
                  const { records: machineProfiles } = res.body;
                  return ensureArray(machineProfiles);
                })
                .then(machineProfiles => {
                  // Remove matched machine profile
                  const currentMachineProfile = config.get('workspace.machineProfile');
                  const currentMachineProfileId = _get(currentMachineProfile, 'id');
                  if (currentMachineProfileId === id) {
                    config.set('workspace.machineProfile', { id: null });
                  }
                });
            } catch (err) {
              // Ignore
            }
          });
      },
      openModal: (name = '', params = {}) => {
        this.setState({
          machineProfiles: {
            ...this.state.machineProfiles,
            modal: {
              name: name,
              params: params
            }
          }
        });
      },
      closeModal: () => {
        this.setState({
          machineProfiles: {
            ...this.state.machineProfiles,
            modal: {
              name: '',
              params: {}
            }
          }
        });
      },
      updateModalParams: (params = {}) => {
        this.setState({
          machineProfiles: {
            ...this.state.machineProfiles,
            modal: {
              ...this.state.machineProfiles.modal,
              params: {
                ...this.state.machineProfiles.modal.params,
                ...params
              }
            }
          }
        });
      }
    },
    // User Accounts
    userAccounts: {
      fetchRecords: (options) => {
        const state = this.state.userAccounts;
        const {
          page = state.pagination.page,
          pageLength = state.pagination.pageLength
        } = { ...options };

        this.setState({
          userAccounts: {
            ...this.state.userAccounts,
            api: {
              ...this.state.userAccounts.api,
              err: false,
              fetching: true
            }
          }
        });

        api.users.fetch({ paging: true, page, pageLength })
          .then((res) => {
            const { pagination, records } = res.body;

            this.setState({
              userAccounts: {
                ...this.state.userAccounts,
                api: {
                  ...this.state.userAccounts.api,
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
              userAccounts: {
                ...this.state.userAccounts,
                api: {
                  ...this.state.userAccounts.api,
                  err: true,
                  fetching: false
                },
                records: []
              }
            });
          });
      },
      createRecord: (options) => {
        const actions = this.actions.userAccounts;

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
        const actions = this.actions.userAccounts;

        api.users.update(id, options)
          .then((res) => {
            actions.closeModal();

            if (forceReload) {
              actions.fetchRecords();
              return;
            }

            const records = [...this.state.userAccounts.records];
            const index = _findIndex(records, { id: id });

            if (index >= 0) {
              records[index] = {
                ...records[index],
                ...options
              };

              this.setState({
                userAccounts: {
                  ...this.state.userAccounts,
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
        const actions = this.actions.userAccounts;

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
          userAccounts: {
            ...this.state.userAccounts,
            modal: {
              name: name,
              params: params
            }
          }
        });
      },
      closeModal: () => {
        this.setState({
          userAccounts: {
            ...this.state.userAccounts,
            modal: {
              name: '',
              params: {}
            }
          }
        });
      },
      updateModalParams: (params = {}) => {
        this.setState({
          userAccounts: {
            ...this.state.userAccounts,
            modal: {
              ...this.state.userAccounts.modal,
              params: {
                ...this.state.userAccounts.modal.params,
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

            const records = [...this.state.commands.records];
            const index = _findIndex(records, { id: id });

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

            const records = [...this.state.events.records];
            const index = _findIndex(records, { id: id });

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

    workspaceSettings: {}, // TODO
  };

  componentDidMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  getInitialState() {
    return {
      // General Settings
      generalSettings: {
        api: {
          err: false,
          loading: true, // defaults to true
          saving: false
        },
        checkForUpdates: true,
        lang: i18next.language
      },
      // Workspace Settings
      workspaceSettings: {
        modal: {
          name: '',
          params: {
          }
        }
      },
      // Machine Profiles
      machineProfiles: {
        api: {
          err: false,
          fetching: false
        },
        pagination: {
          page: 1,
          pageLength: 10,
          totalRecords: 0
        },
        records: [],
        modal: {
          name: '',
          params: {
          }
        }
      },
      // User Accounts
      userAccounts: {
        api: {
          err: false,
          fetching: false
        },
        pagination: {
          page: 1,
          pageLength: 10,
          totalRecords: 0
        },
        records: [],
        modal: {
          name: '',
          params: {
            alertMessage: '',
            changePassword: false
          }
        }
      },
      // Commands
      commands: {
        api: {
          err: false,
          fetching: false
        },
        pagination: {
          page: 1,
          pageLength: 10,
          totalRecords: 0
        },
        records: [],
        modal: {
          name: '',
          params: {
          }
        }
      },
      // Events
      events: {
        api: {
          err: false,
          fetching: false
        },
        pagination: {
          page: 1,
          pageLength: 10,
          totalRecords: 0
        },
        records: [],
        modal: {
          name: '',
          params: {
          }
        }
      },
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
    const sectionPath = pathname.replace(/^\/administration(\/)?/, ''); // TODO
    const id = mapSectionPathToId(sectionPath || initialSectionPath);
    const activeSection = _find(this.sections, { id: id }) || this.sections[0];
    /*
    const sectionItems = this.sections.map((section, index) => (
      <li
        key={section.id}
        className={classNames(
          { [styles.active]: activeSection.id === section.id }
        )}
      >
        <Link to={`/administration/${section.path}`}>
          {section.title}
        </Link>
      </li>
    ));
    */

    // Section component
    const Section = activeSection.component;
    const sectionInitialState = this.initialState[activeSection.id];
    const sectionState = state[activeSection.id];
    const sectionStateChanged = !_isEqual(sectionInitialState, sectionState);
    const sectionActions = actions[activeSection.id];

    return (
      <Section
        initialState={sectionInitialState}
        state={sectionState}
        stateChanged={sectionStateChanged}
        actions={sectionActions}
      />
    );
  }
}

export default withRouter(Administration);
