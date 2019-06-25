/* eslint react/jsx-no-bind: 0 */
import chainedFunction from 'chained-function';
import take from 'lodash/take';
import moment from 'moment';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Anchor from 'app/components/Anchor';
import { Button } from 'app/components/Buttons';
import FormGroup from 'app/components/FormGroup';
import Modal from 'app/components/Modal';
import Space from 'app/components/Space';
import Table from 'app/components/Table';
import ToggleSwitch from 'app/components/ToggleSwitch';
import { TablePagination } from 'app/components/Paginations';
import portal from 'app/lib/portal';
import i18n from 'app/lib/i18n';
import {
    MODAL_CREATE_RECORD,
    MODAL_UPDATE_RECORD
} from './constants';
import styles from './index.styl';

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
                            {i18n._('Add')}
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
                        title: i18n._('Title'),
                        key: 'title',
                        render: (value, row, index) => {
                            const { title } = row;

                            return (
                                <Anchor
                                    onClick={(event) => {
                                        actions.openModal(MODAL_UPDATE_RECORD, row);
                                    }}
                                >
                                    {title}
                                </Anchor>
                            );
                        }
                    },
                    {
                        title: i18n._('Commands'),
                        key: 'commands',
                        render: (value, row, index) => {
                            const style = {
                                background: 'inherit',
                                border: 'none',
                                margin: 0,
                                padding: 0
                            };
                            const { commands } = row;
                            const lines = ('' + row.commands).split('\n');
                            const limit = 4;

                            if (lines.length > limit) {
                                return (
                                    <pre style={style}>
                                        {take(lines, limit).join('\n')}
                                        {'\n'}
                                        {i18n._('and more...')}
                                    </pre>
                                );
                            }

                            return (
                                <pre style={style}>{commands}</pre>
                            );
                        }
                    },
                    {
                        title: i18n._('Date Modified'),
                        className: 'text-nowrap',
                        key: 'date-modified',
                        render: (value, row, index) => {
                            const { mtime } = row;
                            if (mtime) {
                                return moment(mtime).format('lll');
                            }

                            return '–';
                        }
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
                                                <Modal disableOverlay={false} size="xs" onClose={onClose}>
                                                    <Modal.Header>
                                                        <Modal.Title>
                                                            {i18n._('Settings')}
                                                            <Space width="8" />
                                                            &rsaquo;
                                                            <Space width="8" />
                                                            {i18n._('Commands')}
                                                        </Modal.Title>
                                                    </Modal.Header>
                                                    <Modal.Body>
                                                        <FormGroup>
                                                            {i18n._('Are you sure you want to delete this item?')}
                                                        </FormGroup>
                                                        <FormGroup>
                                                            {row.title}
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
