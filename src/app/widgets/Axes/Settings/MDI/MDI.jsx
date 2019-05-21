import findIndex from 'lodash/findIndex';
import React, { PureComponent } from 'react';
import uuid from 'uuid';
import api from 'app/api';
import CreateRecord from './CreateRecord';
import UpdateRecord from './UpdateRecord';
import TableRecords from './TableRecords';
import {
    MODAL_CREATE_RECORD,
    MODAL_UPDATE_RECORD
} from './constants';

class MDI extends PureComponent {
    state = {
        api: {
            err: false,
            fetching: false
        },
        records: [],
        modal: {
            name: '',
            params: {
            }
        }
    };

    action = {
        fetchRecords: () => {
            this.setState(state => ({
                api: {
                    ...state.api,
                    err: false,
                    fetching: true
                }
            }));

            api.mdi.fetch()
                .then((res) => {
                    const { records } = res.body;

                    this.setState(state => ({
                        api: {
                            ...state.api,
                            err: false,
                            fetching: false
                        },
                        records: records
                    }));
                })
                .catch((res) => {
                    this.setState(state => ({
                        api: {
                            ...state.api,
                            err: true,
                            fetching: false
                        },
                        records: []
                    }));
                });
        },

        moveRecord: (from, to) => {
            this.setState(state => {
                const records = [...this.state.records];
                records.splice((to < 0 ? records.length + to : to), 0, records.splice(from, 1)[0]);
                return {
                    records: records
                };
            });
        },

        createRecord: (options) => {
            this.setState(state => ({
                records: state.records.concat({
                    id: uuid.v4(),
                    ...options
                })
            }), () => {
                this.action.closeModal();
            });
        },

        updateRecord: (id, options) => {
            const records = [...this.state.records];
            const index = findIndex(records, { id: id });

            if (index < 0) {
                return;
            }

            records[index] = {
                ...records[index],
                ...options
            };

            this.setState({
                records: records
            }, () => {
                this.action.closeModal();
            });
        },

        removeRecord: (id) => {
            this.setState(state => ({
                records: state.records.filter(record => (record.id !== id))
            }));
        },

        openModal: (name = '', params = {}) => {
            this.setState(state => ({
                modal: {
                    name: name,
                    params: params
                }
            }));
        },

        closeModal: () => {
            this.setState(state => ({
                modal: {
                    name: '',
                    params: {}
                }
            }));
        },

        updateModalParams: (params = {}) => {
            this.setState(state => ({
                modal: {
                    ...state.modal,
                    params: {
                        ...state.modal.params,
                        ...params
                    }
                }
            }));
        }
    };

    componentDidMount() {
        this.action.fetchRecords();
    }

    render() {
        const { state, action } = this;

        return (
            <div>
                {state.modal.name === MODAL_CREATE_RECORD &&
                <CreateRecord state={state} action={action} />
                }
                {state.modal.name === MODAL_UPDATE_RECORD &&
                <UpdateRecord state={state} action={action} />
                }
                <TableRecords state={state} action={action} />
            </div>
        );
    }
}

export default MDI;
