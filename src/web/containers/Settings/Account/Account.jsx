import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import Anchor from '../../../components/Anchor';
import Table, { Toolbar } from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import api from '../../../api';
import confirm from '../../../lib/confirm';
import i18n from '../../../lib/i18n';
import AddAccount from './AddAccount';
import EditAccount from './EditAccount';
import {
    MODAL_STATE_ADD_ACCOUNT,
    MODAL_STATE_EDIT_ACCOUNT
} from './constants';

class Account extends Component {
    static propTypes = {
        state: PropTypes.object,
        stateChanged: PropTypes.bool,
        actions: PropTypes.object
    };

    componentDidMount() {
        const { actions } = this.props;
        actions.fetchData();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        const { state, actions } = this.props;
        const {
            modalState,
            fetching,
            pagination,
            records
        } = state;
        const totalRecords = records.length;

        return (
            <div style={{ margin: -15 }}>
                {modalState === MODAL_STATE_ADD_ACCOUNT &&
                <AddAccount {...this.props} />
                }
                {modalState === MODAL_STATE_EDIT_ACCOUNT &&
                <EditAccount {...this.props} />
                }
                <Table
                    style={{
                        borderBottom: totalRecords > 0 ? '1px solid #ddd' : 'none'
                    }}
                    border={false}
                    loading={fetching}
                    data={records}
                    title={() =>
                        <Toolbar>
                            <button
                                type="button"
                                className="btn btn-default"
                                onClick={() => {
                                    actions.openModal(MODAL_STATE_ADD_ACCOUNT);
                                }}
                            >
                                <i className="fa fa-user-plus" />
                                <span className="space" />
                                {i18n._('Add New Account')}
                            </button>
                            <TablePagination
                                style={{ position: 'absolute', right: 0, top: 0 }}
                                page={pagination.page}
                                pageLength={pagination.pageLength}
                                totalRecords={pagination.totalRecords}
                                onPageChange={({ page, pageLength }) => {
                                    actions.fetchData({ page, pageLength });
                                }}
                            />
                        </Toolbar>
                    }
                    columns={[
                        {
                            title: i18n._('Name'),
                            key: 'name',
                            render: (value, row, index) => {
                                const { name } = row;

                                return (
                                    <Anchor
                                        onClick={(event) => {
                                            actions.openModal(MODAL_STATE_EDIT_ACCOUNT, row);
                                        }}
                                    >
                                        {name}
                                    </Anchor>
                                );
                            }
                        },
                        {
                            title: i18n._('Status'),
                            className: 'text-center',
                            key: 'status',
                            width: '1%',
                            render: (value, row, index) => {
                                const { enabled } = row;

                                if (enabled) {
                                    return (
                                        <span className="text-nowrap">
                                            <i className="fa fa-fw fa-check" />
                                            <span className="space" />
                                            {i18n._('Enabled')}
                                        </span>
                                    );
                                } else {
                                    return (
                                        <span className="text-nowrap">
                                            <i className="fa fa-fw fa-times" />
                                            <span className="space" />
                                            {i18n._('Disabled')}
                                        </span>
                                    );
                                }
                            }
                        },
                        {
                            title: i18n._('Action'),
                            className: 'text-center',
                            key: 'action',
                            width: '1%',
                            render: (value, row, index) => {
                                const { id } = row;

                                return (
                                    <div className="text-nowrap">
                                        <button
                                            type="button"
                                            className="btn btn-xs btn-default"
                                            title={i18n._('Edit Account')}
                                            onClick={(event) => {
                                                actions.openModal(MODAL_STATE_EDIT_ACCOUNT, row);
                                            }}
                                        >
                                            <i className="fa fa-fw fa-edit" />
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-xs btn-default"
                                            title={i18n._('Delete Account')}
                                            onClick={(event) => {
                                                confirm({
                                                    title: i18n._('Delete Account'),
                                                    body: i18n._('Are you sure you want to delete this account?')
                                                }).then(() => {
                                                    api.deleteAccount({ id })
                                                        .then((res) => {
                                                            actions.fetchData();
                                                        })
                                                        .catch((res) => {
                                                            // TODO
                                                        });
                                                });
                                            }}
                                        >
                                            <i className="fa fa-fw fa-trash" />
                                        </button>
                                    </div>
                                );
                            }
                        }
                    ]}
                />
            </div>
        );
    }
}

export default Account;
