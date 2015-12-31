import _ from 'lodash';
import classNames from 'classnames';
import React from 'react';
import update from 'react-addons-update';
import { Table, Column } from 'fixed-data-table';
import i18n from '../../../lib/i18n';
import { GCODE_STATUS } from './constants';

let isColumnResizing = false;

class GCodeTable extends React.Component {
    state = {
        table: {
            width: this.props.width,
            height: this.props.height,
            columns: [
                {
                    dataKey: 'status',
                    isResizable: false,
                    width: 28,
                    align: 'center',
                    cellRenderer: (cellData, cellDataKey, rowData, rowIndex, columnData, width) => {
                        let classes = {
                            icon: classNames(
                                'glyphicon',
                                { 'glyphicon-ok': cellData !== GCODE_STATUS.ERROR },
                                { 'glyphicon-remove': cellData === GCODE_STATUS.ERROR }
                            )
                        };
                        let styles = {
                            icon: {
                                color: (() => {
                                    let cdata = {};
                                    cdata[GCODE_STATUS.ERROR] = '#a71d5d';
                                    cdata[GCODE_STATUS.NOT_STARTED] = '#ddd';
                                    cdata[GCODE_STATUS.IN_PROGRESS] = '#ddd'; // FIXME
                                    cdata[GCODE_STATUS.COMPLETED] = '#333';
                                    return cdata[cellData] || '#ddd';
                                })()
                            }
                        };
                        return (
                            <i className={classes.icon} style={styles.icon}></i>
                        );
                    }
                },
                {
                    dataKey: 'cmd',
                    isResizable: true,
                    flexGrow: 1,
                    width: 100,
                    cellRenderer: (cellData, cellDataKey, rowData, rowIndex, columnData, width) => {
                        return (
                            <span className="text-overflow-ellipsis" style={{width: width}}>
                                <span className="label label-default">{rowIndex + 1}</span> {cellData} 
                            </span>
                        );
                    }
                }
            ]
        }
    };

    rowGetter(index) {
        return this.props.data[index];
    }
    onContentHeightChange(contentHeight) {
        if (!(this.props.onContentDimensionsChange)) {
            return;
        }
        this.props.onContentDimensionsChange(
            contentHeight,
            Math.max(600, this.props.tableWidth)
        );
    }
    onColumnResizeEndCallback(newColumnWidth, dataKey) {
        isColumnResizing = false;
        this.setTableColumnWidth(dataKey, newColumnWidth);
    }
    setTableColumnWidth(dataKey, newColumnWidth) {
        let columns = this.state.table.columns;
        let newState = update(this.state, {
            table: {
                columns: {
                    $apply: function() {
                        let key = _.findKey(columns, { dataKey: dataKey });
                        columns[key].width = newColumnWidth;
                        return columns;
                    }
                }
            }
        });
        this.setState(newState);
    }
    render() {
        if (_.size(this.props.data) > 0) {
            return this.renderTable();
        } else {
            return this.renderEmptyMessage();
        }
    }
    renderTable() {
        let controlledScrolling =
            this.props.left !== undefined || this.props.top !== undefined;

        return (
            <div className="gcode-table">
                <Table
                    className="noHeader"
                    headerHeight={0}
                    rowHeight={this.props.rowHeight || 30}
                    rowGetter={::this.rowGetter}
                    rowsCount={_.size(this.props.data)}
                    width={this.state.table.width}
                    height={this.state.table.height}
                    onContentHeightChange={::this.onContentHeightChange}
                    scrollToRow={this.props.scrollToRow}
                    scrollTop={this.props.top}
                    scrollLeft={this.props.left}
                    overflowX={controlledScrolling ? "hidden" : "auto"}
                    overflowY={controlledScrolling ? "hidden" : "auto"}
                    isColumnResizing={isColumnResizing}
                    onColumnResizeEndCallback={::this.onColumnResizeEndCallback}
                >
                    {this.renderTableColumns()}
                </Table>
            </div>
        );
    }
    renderTableColumns() {
        let columns = this.state.table.columns;
        return columns.map(function(column, key) {
            return (
                <Column
                    label={column.name}
                    dataKey={column.dataKey}
                    width={column.width}
                    flexGrow={column.flexGrow}
                    isResizable={!!column.isResizable}
                    key={key}
                    align={column.align}
                    headerClassName={column.headerClassName}
                    headerRenderer={column.headerRenderer}
                    cellClassName={column.cellClassName}
                    cellRenderer={column.cellRenderer}
                />
            );
        }.bind(this));
    }
    renderEmptyMessage() {
        return (
            <p className="">{i18n._('No data to display')}</p>
        );
    }
}

export default GCodeTable;
