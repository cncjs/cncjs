/* eslint react/jsx-no-bind: 0 */
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import Anchor from '../../../components/Anchor';
import Table, { Toolbar } from '../../../components/Table';
import { TablePagination } from '../../../components/Paginations';
import confirm from '../../../lib/confirm';
import i18n from '../../../lib/i18n';
import {
    MODAL_ADD,
    MODAL_EDIT
} from './constants';

class TableView extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        const { state, actions } = this.props;
        const totalRecords = state.records.length;

        return (
            <Table
                style={{
                    borderBottom: totalRecords > 0 ? '1px solid #ddd' : 'none'
                }}
                border={false}
                data={(state.api.err || state.api.fetching) ? [] : state.records}
                rowKey={(record) => {
                    return record.id;
                }}
                emptyText={() => {
                    if (state.api.err) {
                        return (
                            <span className="text-danger">
                                {i18n._('An unexpected error has occurred.')}
                            </span>
                        );
                    }

                    if (state.api.fetching) {
                        return (
                            <span>
                                <i className="fa fa-fw fa-spin fa-circle-o-notch" />
                                <span className="space" />
                                {i18n._('Loading...')}
                            </span>
                        );
                    }

                    return i18n._('No data to display');
                }}
                title={() =>
                    <Toolbar>
                        <button
                            type="button"
                            className="btn btn-default"
                            onClick={() => {
                                actions.openModal(MODAL_ADD);
                            }}
                        >
                            <i className="fa fa-user-plus" />
                            <span className="space" />
                            {i18n._('Add New Account')}
                        </button>
                        <div style={{ position: 'absolute', right: 0, top: 0 }}>
                            <TablePagination
                                page={state.pagination.page}
                                pageLength={state.pagination.pageLength}
                                totalRecords={state.pagination.totalRecords}
                                onPageChange={({ page, pageLength }) => {
                                    actions.fetchItems({ page, pageLength });
                                }}
                                prevPageRenderer={() => <i className="fa fa-angle-left" />}
                                nextPageRenderer={() => <i className="fa fa-angle-right" />}
                            />
                        </div>
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
                                        actions.openModal(MODAL_EDIT, row);
                                    }}
                                >
                                    {name}
                                </Anchor>
                            );
                        }
                    },
                    {
                        title: i18n._('Status'),
                        className: 'text-nowrap',
                        key: 'status',
                        width: '1%',
                        render: (value, row, index) => {
                            const { enabled } = row;

                            if (enabled) {
                                return (
                                    <span>
                                        <i className="fa fa-fw fa-check" />
                                        <span className="space" />
                                        {i18n._('Enabled')}
                                    </span>
                                );
                            } else {
                                return (
                                    <span>
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
                        className: 'text-nowrap',
                        key: 'action',
                        width: '1%',
                        render: (value, row, index) => {
                            const { id } = row;

                            return (
                                <div>
                                    <button
                                        type="button"
                                        className="btn btn-xs btn-default"
                                        title={i18n._('Edit Account')}
                                        onClick={(event) => {
                                            actions.openModal(MODAL_EDIT, row);
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
                                                body: i18n._('Are you sure you want to delete the account?')
                                            }).then(() => {
                                                actions.deleteItem(id);
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
        );
    }
}

export default TableView;
