import _ from 'lodash';
import i18n from 'i18next';
import moment from 'moment';
import React from 'react';
import classNames from 'classnames';
import { Table, Column } from 'fixed-data-table';
import Widget, { WidgetHeader, WidgetContent } from '../widget';
import log from '../../lib/log';
import socket from '../../socket';
import store from '../../store';
import './gcode.css';

let isColumnResizing = false;

let stripComments = (() => {
    let re1 = /^\s+|\s+$/g; // Strip leading and trailing spaces
    let re2 = /\s*[#;].*$/g; // Strip everything after # or ; to the end of the line, including preceding spaces
    return (s) => {
        return s.replace(re1, '').replace(re2, '');
    };
})();

const GCODE_STATUS = {
    ERROR: -1,
    NOT_STARTED: 0,
    IN_PROGRESS: 1,
    COMPLETED: 2
};

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
        if ( ! this.props.onContentDimensionsChange) {
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
        let newState = React.addons.update(this.state, {
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
            <p className="">No data to display</p>
        );
    }
}

class GCodeStats extends React.Component {
    state = {
        duration: 0
    };

    componentDidMount() {
        this.timer = setInterval(() => {
            if (this.props.startTime <= 0) {
                return;
            }

            let from = moment.unix(this.props.startTime);
            let to = moment();
            let duration = to.diff(from, 'seconds');
            this.setState({ duration: duration });
        }, 1000);
    }
    componentWillUnmount() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    render() {
        let total = this.props.total || 0;
        let executed = this.props.executed || 0;
        let startTime = '–';
        let duration = '–';

        if (this.props.startTime > 0) {
            startTime = moment.unix(this.props.startTime).format('YYYY-MM-DD HH:mm:ss');
        }

        if (this.state.duration > 0) {
            let d = moment.duration(this.state.duration, 'seconds');
            let hours = _.padLeft(d.hours(), 2, '0');
            let minutes = _.padLeft(d.minutes(), 2, '0');
            let seconds = _.padLeft(d.seconds(), 2, '0');

            duration = hours + ':' + minutes + ':' + seconds;
        }

        return (
            <div className="container-fluid gcode-stats">
                <div className="row">
                    <div className="col-xs-6">{i18n._('Executed')}</div>
                    <div className="col-xs-6">{i18n._('Total')}</div>
                </div>
                <div className="row">
                    <div className="col-xs-6">{executed}</div>
                    <div className="col-xs-6">{total}</div>
                </div>
                <div className="row">
                    <div className="col-xs-6">{i18n._('Start Time')}</div>
                    <div className="col-xs-6">{i18n._('Duration')}</div>
                </div>
                <div className="row">
                    <div className="col-xs-6">{startTime}</div>
                    <div className="col-xs-6">{duration}</div>
                </div>
            </div>
        );
    }
}

export default class GCode extends React.Component {
    state = {
        port: '',
        commands: [], // a list of gcode commands
        alertMessage: '',
        startTime: 0, // unix timestamp

        // Queue Status
        queueStatus: {
            executed: 0,
            total: 0
        }
    };

    uploadData = null;

    componentDidMount() {
        this.subscribeToEvents();
        this.addSocketEvents();
    }
    componentWillUnmount() {
        this.removeSocketEvents();
        this.unsubscribeFromEvents();
    }
    subscribeToEvents() {
        let that = this;

        this._subscribedEvents = [];

        this._subscribedEvents.push(store.subscribe(() => {
            let port = _.get(store.getState(), 'port');
            that.setState({ port: port });
        }));

        this._subscribedEvents.push(store.subscribe(() => {
            let data = _.get(store.getState(), 'gcode.data');
            let lines = data.split('\n');
            let commands = _(lines)
                .map(function(line) {
                    return stripComments(line);
                })
                .compact()
                .map(function(line) {
                    return {
                        status: GCODE_STATUS.NOT_STARTED,
                        cmd: line
                    };
                })
                .value();

            that.setState({ commands: commands });
        }));
    }
    unsubscribeFromEvents() {
        _.each(this._subscribedEvents, (unsubscribe) => {
            unsubscribe();
        });
    }
    addSocketEvents() {
        socket.on('gcode:queue-status', ::this.socketOnGCodeQueueStatus);
    }
    removeSocketEvents() {
        socket.off('gcode:queue-status', ::this.socketOnGCodeQueueStatus);
    }
    socketOnGCodeQueueStatus(data) {
        let list = {};
        let from = this.state.queueStatus.executed;
        let to = data.executed;

        for (let i = from; i < to; ++i) {
            list[i] = {
                status: {
                    $set: GCODE_STATUS.COMPLETED
                }
            };
        }

        let updatedCommands = React.addons.update(this.state.commands, list);
        this.setState({
            commands: updatedCommands,
            queueStatus: {
                executed: Number(data.executed),
                total: Number(data.total)
            }
        });
    }

    render() {
        let tableWidth = this.props.width - 2 /* border */ - 20 /* padding */;
        let tableHeight = 180;
        let rowHeight = 30;
        let visibleRows = Math.floor(tableHeight / rowHeight);
        let isLoaded = (_.size(this.state.commands) > 0);
        let notLoaded = ! isLoaded;
        let scrollToRow = Math.min(
            this.state.queueStatus.executed + (Math.floor(visibleRows / 2) - 1),
            this.state.queueStatus.total
        );

        return (
            <div>
                {isLoaded &&
                <GCodeTable
                    width={tableWidth}
                    height={tableHeight}
                    rowHeight={rowHeight}
                    data={this.state.commands}
                    scrollToRow={scrollToRow}
                />
                }

                <GCodeStats
                    executed={this.state.queueStatus.executed}
                    total={this.state.queueStatus.total}
                    startTime={this.state.startTime}
                />
            </div>
        );
    }
}

export default class GCodeWidget extends React.Component {
    state = {
        isCollapsed: false
    };

    handleClick(target, val) {
        if (target === 'toggle') {
            this.setState({
                isCollapsed: !!val
            });
        }
    }
    render() {
        let width = 360;
        let title = (
            <div><i className="glyphicon glyphicon-tasks"></i>{i18n._('GCode')}</div>
        );
        let toolbarButtons = [
            'toggle'
        ];
        let widgetContentClass = classNames(
            { 'hidden': this.state.isCollapsed }
        );

        return (
            <div data-component="Widgets/GCodeWidget">
                <Widget width={width}>
                    <WidgetHeader
                        title={title}
                        toolbarButtons={toolbarButtons}
                        handleClick={::this.handleClick}
                    />
                    <WidgetContent className={widgetContentClass}>
                        <GCode width={width} />
                    </WidgetContent>
                </Widget>
            </div>
        );
    }
}
