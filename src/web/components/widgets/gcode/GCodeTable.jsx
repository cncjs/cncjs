import _ from 'lodash';
import classNames from 'classnames';
import colornames from 'colornames';
import React, { Component, PropTypes } from 'react';
import { FlexTable, FlexColumn } from 'react-virtualized';
import { GCODE_STATUS } from './constants';

class GCodeTable extends Component {
    static propTypes = {
        rows: PropTypes.array,
        scrollToRow: PropTypes.number
    };
    static defaultProps = {
        rows: [],
        scrollToRow: 0
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state);
    }
    render() {
        const rows = this.props.rows;
        const headerHeight = 32;
        const rowHeight = 30;
        const visibleRows = 6;
        const height = headerHeight + rowHeight * visibleRows;
        const width = 320;
        const offset = (visibleRows % 2 === 0) ? 0 : 1;
        const scrollToIndex = Math.max(0, (this.props.scrollToRow - 1) + (Math.ceil(visibleRows / 2) - offset));

        return (
            <div className="gcode-table">
                <FlexTable
                    disableHeader={true}
                    headerHeight={headerHeight}
                    height={height}
                    rowGetter={({ index }) => {
                        return rows[index];
                    }}
                    rowHeight={rowHeight}
                    rowCount={rows.length}
                    scrollToIndex={scrollToIndex}
                    width={width}
                >
                    <FlexColumn
                        className="gcode-table-cell-status"
                        cellRenderer={({ cellData, columnData, dataKey, rowData, rowIndex }) => {
                            const value = rowData.status;
                            const classes = {
                                icon: classNames(
                                    'fa',
                                    { 'fa-check': value !== GCODE_STATUS.ERROR },
                                    { 'fa-ban': value === GCODE_STATUS.ERROR }
                                )
                            };
                            const styles = {
                                icon: {
                                    color: (() => {
                                        const color = {};
                                        color[GCODE_STATUS.ERROR] = colornames('indian red');
                                        color[GCODE_STATUS.NOT_STARTED] = colornames('gray 80');
                                        color[GCODE_STATUS.IN_PROGRESS] = colornames('gray 80');
                                        color[GCODE_STATUS.COMPLETED] = colornames('gray 20');
                                        return color[value] || colornames('gray 80');
                                    })()
                                }
                            };

                            return (
                                <i className={classes.icon} style={styles.icon}></i>
                            );
                        }}
                        dataKey="status"
                        width={30}
                    />
                    <FlexColumn
                        className="gcode-table-cell-command"
                        cellRenderer={({ cellData, columnData, dataKey, rowData, rowIndex }) => {
                            const value = rowData.cmd;
                            const style = {
                                backgroundColor: colornames('gray 25'),
                                marginRight: 5
                            };

                            return (
                                <div>
                                    <span className="label" style={style}>{rowIndex + 1}</span>{value}
                                </div>
                            );
                        }}
                        dataKey="cmd"
                        flexGrow={1}
                        width={290}
                    />
                </FlexTable>
            </div>
        );
    }
}

export default GCodeTable;
