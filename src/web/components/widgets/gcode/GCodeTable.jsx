import _ from 'lodash';
import classNames from 'classnames';
import React from 'react';
import update from 'react-addons-update';
import { Table, Column, Cell } from 'fixed-data-table';
import i18n from '../../../lib/i18n';
import { GCODE_STATUS } from './constants';

class GCodeTable extends React.Component {
    static propTypes = {
        width: React.PropTypes.number,
        height: React.PropTypes.number,
        rowHeight: React.PropTypes.number,
        data: React.PropTypes.array,
        scrollToRow: React.PropTypes.number
    };

    render() {
        if (_.size(this.props.data) > 0) {
            return this.renderTable();
        } else {
            return this.renderEmptyMessage();
        }
    }
    renderTable() {
        return (
            <div className="gcode-table">
                <Table
                    className="noHeader"
                    headerHeight={0}
                    rowHeight={this.props.rowHeight || 30}
                    rowsCount={_.size(this.props.data)}
                    width={this.props.width}
                    height={this.props.height}
                    scrollToRow={this.props.scrollToRow}
                    scrollTop={this.props.top}
                    scrollLeft={this.props.left}
                >
                    <Column
                        header={<Cell></Cell>}
                        cell={({rowIndex, width, height, ...props}) => {
                            const status = this.props.data[rowIndex].status;
                            const classes = {
                                icon: classNames(
                                    'fa',
                                    { 'fa-check': status !== GCODE_STATUS.ERROR },
                                    { 'fa-ban': status === GCODE_STATUS.ERROR }
                                )
                            };
                            const styles = {
                                icon: {
                                    color: (() => {
                                        let cdata = {};
                                        cdata[GCODE_STATUS.ERROR] = '#a71d5d';
                                        cdata[GCODE_STATUS.NOT_STARTED] = '#ddd';
                                        cdata[GCODE_STATUS.IN_PROGRESS] = '#ddd'; // FIXME
                                        cdata[GCODE_STATUS.COMPLETED] = '#333';
                                        return cdata[status] || '#ddd';
                                    })()
                                }
                            };

                            return (
                                <Cell
                                    width={width}
                                    heigh={height}
                                >
                                    <i className={classes.icon} style={styles.icon}></i>
                                </Cell>
                            );
                        }}
                        width={28}
                    />
                    <Column
                        header={<Cell></Cell>}
                        cell={({rowIndex, width, height, ...props}) => (
                            <Cell
                                width={width}
                                heigh={height}
                            >
                                <span className="text-overflow-ellipsis" style={{width: width}}>
                                    <span className="label label-default">{rowIndex+1}</span> {this.props.data[rowIndex].cmd} 
                                </span>
                            </Cell>
                        )}
                        isResizable={true}
                        flexGrow={1}
                        width={100}
                    />
                </Table>
            </div>
        );
    }
    renderEmptyMessage() {
        return (
            <p className="">{i18n._('No data to display')}</p>
        );
    }
}

export default GCodeTable;
