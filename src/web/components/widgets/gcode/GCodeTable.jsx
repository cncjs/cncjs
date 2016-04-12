import classNames from 'classnames';
import colornames from 'colornames';
import React from 'react';
import { Table, Column, Cell } from 'fixed-data-table';
import { GCODE_STATUS } from './constants';

class GCodeTable extends React.Component {
    static propTypes = {
        rows: React.PropTypes.array,
        scrollToRow: React.PropTypes.number
    };
    static defaultProps = {
        rows: [],
        scrollToRow: 0
    };

    render() {
        const rows = this.props.rows;
        const headerHeight = 32;
        const rowHeight = 30;
        const visibleRows = 6;
        const height = headerHeight + rowHeight * visibleRows;
        const width = 320;
        const offset = (visibleRows % 2 === 0) ? 0 : 1;
        const scrollToRow = Math.max(0, (this.props.scrollToRow - 1) + (Math.ceil(visibleRows / 2) - offset));

        return (
            <div className="gcode-table">
                <Table
                    rowHeight={rowHeight}
                    rowsCount={rows.length}
                    width={width}
                    height={height}
                    headerHeight={headerHeight}
                    scrollToRow={scrollToRow} // zero-based index
                >
                    <Column
                        header={<Cell></Cell>}
                        cell={({ rowIndex, ...props }) => {
                            const value = rows[rowIndex][1];
                            const classes = {
                                icon: classNames(
                                    'fa',
                                    { 'fa-check': value !== GCODE_STATUS.ERROR },
                                    { 'fa-ban': value === GCODE_STATUS.ERROR }
                                )
                            };
                            const styles = {
                                cell: {
                                    backgroundColor: colornames('gray 95')
                                },
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
                                <Cell style={styles.cell} {...props}>
                                    <i className={classes.icon} style={styles.icon}></i>
                                </Cell>
                            );
                        }}
                        width={30}
                    />
                    <Column
                        header={<Cell>G-code</Cell>}
                        cell={({ rowIndex, ...props }) => {
                            const value = rows[rowIndex][2];
                            const style = {
                                backgroundColor: colornames('gray 25'),
                                marginRight: 5
                            };

                            return (
                                <Cell {...props}>
                                    <span className="label" style={style}>{rowIndex + 1}</span>{value}
                                </Cell>
                            );
                        }}
                        width={290}
                    />
                </Table>
            </div>
        );
    }
}

export default GCodeTable;
