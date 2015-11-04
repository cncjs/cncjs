import _ from 'lodash';
import i18n from 'i18next';
import moment from 'moment';
import pubsub from 'pubsub-js';
import React from 'react';
import classNames from 'classnames';
import { Table, Column } from 'fixed-data-table';
import Widget, { WidgetHeader, WidgetContent } from '../widget';
import log from '../../lib/log';
import socket from '../../lib/socket';
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
        startTime: 0,
        duration: 0,
        dimension: {
            min: {
                x: 0,
                y: 0,
                z: 0
            },
            max: {
                x: 0,
                y: 0,
                z: 0
            },
            delta: {
                x: 0,
                y: 0,
                z: 0
            }
        }
    };

    componentDidMount() {
        this.subscribe();
        this.setTimer();
    }
    componentWillUnmount() {
        this.clearTimer();
        this.unsubscribe();
    }
    subscribe() {
        let that = this;

        this.pubsubTokens = [];

        { // gcode:dimension
            let token = pubsub.subscribe('gcode:dimension', (msg, dimension) => {
                dimension = _.defaultsDeep(dimension, {
                    min: {
                        x: 0,
                        y: 0,
                        z: 0
                    },
                    max: {
                        x: 0,
                        y: 0,
                        z: 0
                    },
                    delta: {
                        x: 0,
                        y: 0,
                        z: 0
                    }
                });
                that.setState({ dimension: dimension });
            });
            this.pubsubTokens.push(token);
        }

        { // gcode:run
            let token = pubsub.subscribe('gcode:run', (msg) => {
                let now = moment().unix();
                let startTime = that.state.startTime || now; // use startTime or current time
                let duration = (startTime !== now) ? that.state.duration : 0;
                that.setState({
                    startTime: startTime,
                    duration: duration
                });
            });
            this.pubsubTokens.push(token);
        }
        
        { // gcode:stop
            let token = pubsub.subscribe('gcode:stop', (msg) => {
                that.setState({
                    startTime: 0,
                    duration: 0
                });
            });
            this.pubsubTokens.push(token);
        }
    }
    unsubscribe() {
        _.each(this.pubsubTokens, (token) => {
            pubsub.unsubscribe(token);
        });
        this.pubsubTokens = [];
    }
    setTimer() {
        this.timer = setInterval(() => {
            if (this.state.startTime <= 0) {
                this.setState({ duration: 0 });
                return;
            }

            let from = moment.unix(this.state.startTime);
            let to = moment();
            let duration = to.diff(from, 'seconds');
            this.setState({ duration: duration });
        }, 1000);
    }
    clearTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    render() {
        let dimension = this.state.dimension;
        let total = this.props.total || 0;
        let executed = this.props.executed || 0;
        let startTime = '–';
        let duration = '–';
        let unit = 'mm';
        let digits = (unit === 'mm') ? 3 : 4; // mm=3, inch=4

        if (this.state.startTime > 0) {
            startTime = moment.unix(this.state.startTime).format('YYYY-MM-DD HH:mm:ss');
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
                    <div className="col-xs-12">
                        <div>{i18n._('Dimension:')}</div>
                    </div>
                </div>
                <div className="row">
                    <div className="col-xs-12">
                        <table className="table-bordered" data-table="dimension">
                            <thead>
                                <tr>
                                    <th className="axis">Axis</th>
                                    <th>Min</th>
                                    <th>Max</th>
                                    <th>Delta</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="axis">X</td>
                                    <td>{dimension.min.x.toFixed(digits)} {unit}</td>
                                    <td>{dimension.max.x.toFixed(digits)} {unit}</td>
                                    <td>{dimension.delta.x.toFixed(digits)} {unit}</td>
                                </tr>
                                <tr>
                                    <td className="axis">Y</td>
                                    <td>{dimension.min.y.toFixed(digits)} {unit}</td>
                                    <td>{dimension.max.y.toFixed(digits)} {unit}</td>
                                    <td>{dimension.delta.y.toFixed(digits)} {unit}</td>
                                </tr>
                                <tr>
                                    <td className="axis">Z</td>
                                    <td>{dimension.min.z.toFixed(digits)} {unit}</td>
                                    <td>{dimension.max.z.toFixed(digits)} {unit}</td>
                                    <td>{dimension.delta.z.toFixed(digits)} {unit}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
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

        // Queue Status
        queueStatus: {
            executed: 0,
            total: 0
        }
    };

    componentDidMount() {
        this.subscribe();
        this.addSocketEvents();
    }
    componentWillUnmount() {
        this.removeSocketEvents();
        this.unsubscribe();
    }
    subscribe() {
        let that = this;

        this.pubsubTokens = [];

        { // port
            let token = pubsub.subscribe('port', (msg, port) => {
                port = port || '';
                that.setState({ port: port });
            });
            this.pubsubTokens.push(token);
        }

        { // gcode:data
            let token = pubsub.subscribe('gcode:data', (msg, gcode) => {
                gcode = gcode || '';
                let lines = gcode.split('\n');
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
            });
            this.pubsubTokens.push(token);
        }
    }
    unsubscribe() {
        _.each(this.pubsubTokens, (token) => {
            pubsub.unsubscribe(token);
        });
        this.pubsubTokens = [];
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

        // Reset obsolete queue items
        for (let i = to; i < from; ++i) {
            list[i] = {
                status: {
                    $set: GCODE_STATUS.NOT_STARTED
                }
            };
        }

        // Update completed queue items
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
        let notLoaded = !isLoaded;
        let scrollToRow = Math.min(
            this.state.queueStatus.executed + (Math.floor(visibleRows / 2) - 1),
            this.state.queueStatus.total
        );

        return (
            <div>
                <GCodeStats
                    executed={this.state.queueStatus.executed}
                    total={this.state.queueStatus.total}
                />

                {isLoaded &&
                <GCodeTable
                    width={tableWidth}
                    height={tableHeight}
                    rowHeight={rowHeight}
                    data={this.state.commands}
                    scrollToRow={scrollToRow}
                />
                }
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
            <div><i className="glyphicon glyphicon-dashboard"></i>{i18n._('G-code')}</div>
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
