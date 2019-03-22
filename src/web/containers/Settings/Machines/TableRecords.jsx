/* eslint react/jsx-no-bind: 0 */
import chainedFunction from 'chained-function';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Anchor from '../../../components/Anchor';
import { Button } from '../../../components/Buttons';
import { FormGroup } from '../../../components/Forms';
import Modal from '../../../components/Modal';
import Space from '../../../components/Space';
import Table from '../../../components/Table';
import ToggleSwitch from '../../../components/ToggleSwitch';
import { TablePagination } from '../../../components/Paginations';
import portal from '../../../lib/portal';
import i18n from '../../../lib/i18n';
import {
    MODAL_CREATE_RECORD,
    MODAL_UPDATE_RECORD
} from './constants';
import styles from './index.styl';

const Axis = ({ value, sub }) => (
    <div>{value}<sub style={{ marginLeft: 2 }}>{sub}</sub></div>
);

class TableRecords extends PureComponent {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    render() {
        const { state, actions } = this.props;

        return (
            <Table
                bordered={false}
                justified={false}
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
                                <Space width="8" />
                                {i18n._('Loading...')}
                            </span>
                        );
                    }

                    return i18n._('No data to display');
                }}
                title={() => (
                    <div className={styles.tableToolbar}>
                        <button
                            type="button"
                            className="btn btn-default"
                            onClick={() => {
                                actions.openModal(MODAL_CREATE_RECORD);
                            }}
                        >
                            <i className="fa fa-plus" />
                            <Space width="8" />
                            {i18n._('New')}
                        </button>
                        <TablePagination
                            style={{
                                position: 'absolute',
                                right: 0,
                                top: 0
                            }}
                            page={state.pagination.page}
                            pageLength={state.pagination.pageLength}
                            totalRecords={state.pagination.totalRecords}
                            onPageChange={({ page, pageLength }) => {
                                actions.fetchRecords({ page, pageLength });
                            }}
                            prevPageRenderer={() => <i className="fa fa-angle-left" />}
                            nextPageRenderer={() => <i className="fa fa-angle-right" />}
                        />
                    </div>
                )}
                columns={[
                    {
                        title: i18n._('Enabled'),
                        key: 'enabled',
                        render: (value, row, index) => {
                            const { id, enabled } = row;
                            const title = enabled ? i18n._('Enabled') : i18n._('Disabled');

                            return (
                                <ToggleSwitch
                                    checked={enabled}
                                    size="sm"
                                    title={title}
                                    onChange={(event) => {
                                        actions.updateRecord(id, { enabled: !enabled });
                                    }}
                                />
                            );
                        }
                    },
                    {
                        title: i18n._('Name'),
                        key: 'name',
                        render: (value, row, index) => {
                            const { name } = row;

                            return (
                                <Anchor
                                    onClick={(event) => {
                                        actions.openModal(MODAL_UPDATE_RECORD, row);
                                    }}
                                >
                                    {name}
                                </Anchor>
                            );
                        }
                    },
                    {
                        title: (<Axis value="X" sub="min" />),
                        key: 'xmin',
                        render: (value, row, index) => row.xmin
                    },
                    {
                        title: (<Axis value="X" sub="max" />),
                        key: 'xmax',
                        render: (value, row, index) => row.xmax
                    },
                    {
                        title: (<Axis value="Y" sub="min" />),
                        key: 'ymin',
                        render: (value, row, index) => row.ymin
                    },
                    {
                        title: (<Axis value="Y" sub="max" />),
                        key: 'ymax',
                        render: (value, row, index) => row.ymax
                    },
                    {
                        title: (<Axis value="Z" sub="min" />),
                        key: 'zmin',
                        render: (value, row, index) => row.zmin
                    },
                    {
                        title: (<Axis value="Z" sub="max" />),
                        key: 'zmax',
                        render: (value, row, index) => row.zmax
                    },
                    {
                        title: i18n._('Action'),
                        className: 'text-nowrap',
                        key: 'action',
                        render: (value, row, index) => {
                            return (
                                <div>
                                    <button
                                        type="button"
                                        className="btn btn-xs btn-default"
                                        title={i18n._('Update')}
                                        onClick={(event) => {
                                            actions.openModal(MODAL_UPDATE_RECORD, row);
                                        }}
                                    >
                                        <i className="fa fa-fw fa-edit" />
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-xs btn-default"
                                        title={i18n._('Delete')}
                                        onClick={(event) => {
                                            portal(({ onClose }) => (
                                                <Modal size="xs" onClose={onClose}>
                                                    <Modal.Header>
                                                        <Modal.Title>
                                                            {i18n._('Settings')}
                                                            <Space width="8" />
                                                            &rsaquo;
                                                            <Space width="8" />
                                                            {i18n._('Machine Profiles')}
                                                        </Modal.Title>
                                                    </Modal.Header>
                                                    <Modal.Body>
                                                        <FormGroup>
                                                            {i18n._('Are you sure you want to delete this item?')}
                                                        </FormGroup>
                                                        <FormGroup>
                                                            {row.name}
                                                        </FormGroup>
                                                    </Modal.Body>
                                                    <Modal.Footer>
                                                        <Button
                                                            onClick={onClose}
                                                        >
                                                            {i18n._('Cancel')}
                                                        </Button>
                                                        <Button
                                                            btnStyle="primary"
                                                            onClick={chainedFunction(
                                                                () => {
                                                                    actions.deleteRecord(row.id);
                                                                },
                                                                onClose
                                                            )}
                                                        >
                                                            {i18n._('OK')}
                                                        </Button>
                                                    </Modal.Footer>
                                                </Modal>
                                            ));
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

export default TableRecords;
