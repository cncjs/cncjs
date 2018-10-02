import get from 'lodash/get';
import take from 'lodash/take';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Button, ButtonGroup } from 'app/components/Buttons';
import Space from 'app/components/Space';
import Table from 'app/components/Table';
import i18n from 'app/lib/i18n';
import {
    MODAL_CREATE_RECORD,
    MODAL_UPDATE_RECORD
} from './constants';

class TableRecords extends PureComponent {
    static propTypes = {
        state: PropTypes.object,
        action: PropTypes.object
    };

    render() {
        const { state, action } = this.props;

        return (
            <Table
                bordered={false}
                justified={false}
                hoverable={false}
                maxHeight={300}
                useFixedHeader={true}
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
                    <Button
                        btnStyle="flat"
                        onClick={() => {
                            action.openModal(MODAL_CREATE_RECORD);
                        }}
                    >
                        <i className="fa fa-plus" />
                        <Space width="8" />
                        {i18n._('New')}
                    </Button>
                )}
                columns={[
                    {
                        title: i18n._('Order'),
                        className: 'text-nowrap',
                        key: 'order',
                        width: 80,
                        render: (value, row, rowIndex) => (
                            <ButtonGroup>
                                <Button
                                    btnSize="xs"
                                    btnStyle="flat"
                                    compact
                                    disabled={rowIndex === 0}
                                    title={i18n._('Move Up')}
                                    onClick={() => {
                                        if (rowIndex > 0) {
                                            const from = rowIndex;
                                            const to = rowIndex - 1;
                                            action.moveRecord(from, to);
                                        }
                                    }}
                                >
                                    <i className="fa fa-fw fa-chevron-up" />
                                </Button>
                                <Button
                                    btnSize="xs"
                                    btnStyle="flat"
                                    compact
                                    disabled={rowIndex === (state.records.length - 1)}
                                    title={i18n._('Move Down')}
                                    onClick={() => {
                                        if (rowIndex < (state.records.length - 1)) {
                                            const from = rowIndex;
                                            const to = rowIndex + 1;
                                            action.moveRecord(from, to);
                                        }
                                    }}
                                >
                                    <i className="fa fa-fw fa-chevron-down" />
                                </Button>
                            </ButtonGroup>
                        )
                    },
                    {
                        title: i18n._('Name'),
                        className: 'text-nowrap',
                        key: 'name',
                        dataKey: 'name'
                    },
                    {
                        title: i18n._('Command'),
                        key: 'command',
                        render: (value, row, rowIndex) => {
                            const style = {
                                background: 'inherit',
                                border: 'none',
                                margin: 0,
                                padding: 0
                            };
                            const { command } = row;
                            const lines = ('' + row.command).split('\n');
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
                                <pre style={style}>{command}</pre>
                            );
                        }
                    },
                    {
                        title: i18n._('Button Width'),
                        className: 'text-nowrap',
                        key: 'grid.xs',
                        render: (value, row, rowIndex) => {
                            value = get(row, 'grid.xs');
                            return {
                                1: (<span><sup>1</sup>/<sub>12</sub></span>),
                                2: (<span><sup>1</sup>/<sub>6</sub></span>),
                                3: (<span><sup>1</sup>/<sub>4</sub></span>),
                                4: (<span><sup>1</sup>/<sub>3</sub></span>),
                                5: (<span><sup>5</sup>/<sub>12</sub></span>),
                                6: (<span><sup>1</sup>/<sub>2</sub></span>),
                                7: (<span><sup>7</sup>/<sub>12</sub></span>),
                                8: (<span><sup>2</sup>/<sub>3</sub></span>),
                                9: (<span><sup>3</sup>/<sub>4</sub></span>),
                                10: (<span><sup>5</sup>/<sub>6</sub></span>),
                                11: (<span><sup>11</sup>/<sub>12</sub></span>),
                                12: '100%'
                            }[value] || '–';
                        }
                    },
                    {
                        title: i18n._('Action'),
                        className: 'text-nowrap',
                        key: 'action',
                        width: 90,
                        render: (value, row, rowIndex) => (
                            <div>
                                <Button
                                    btnSize="xs"
                                    btnStyle="flat"
                                    compact
                                    title={i18n._('Update')}
                                    onClick={(event) => {
                                        action.openModal(MODAL_UPDATE_RECORD, row);
                                    }}
                                >
                                    <i className="fa fa-fw fa-edit" />
                                </Button>
                                <Button
                                    btnSize="xs"
                                    btnStyle="flat"
                                    compact
                                    title={i18n._('Remove')}
                                    onClick={(event) => {
                                        action.removeRecord(row.id);
                                    }}
                                >
                                    <i className="fa fa-fw fa-close" />
                                </Button>
                            </div>
                        )
                    }
                ]}
            />
        );
    }
}

export default TableRecords;
