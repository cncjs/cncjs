import _ from 'lodash';
import i18n from 'i18next';
import moment from 'moment';
import React from 'react';
import classNames from 'classnames';
import { Table, Column } from 'fixed-data-table';
import Widget, { WidgetHeader, WidgetContent } from '../widget';
import log from '../../lib/log';
import socket from '../../socket';
import siofu from '../../siofu';
import store from '../../store';
import { GCODE_LOAD, GCODE_UNLOAD } from '../../actions';
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

class Alert extends React.Component {
    render() {
        return (
            <div>
                {this.props.msg &&
                <div className="alert alert-danger fade in" style={{padding: '4px'}}>
                    <a
                        href="javascript:void(0)"
                        className="close"
                        data-dismiss="alert"
                        aria-label="close"
                        style={{fontSize: '16px'}}
                        onClick={this.props.dismiss}
                    >×</a>
                    {this.props.msg}
                </div>
                }
            </div>
        );
    }
}

class Progress extends React.Component {
    render() {
        let now = this.props.now || 0;
        let min = this.props.min || 0;
        let max = this.props.max || 0;
        return (
            <div>
                <div className="progress">
                    <div
                        className="progress-bar"
                        role="progressbar"
                        aria-valuenow={now}
                        aria-valuemin={min}
                        aria-valuemax={max}
                        style={{width: now + '%'}}
                    >
                        <span>{now}%</span>
                    </div>
                </div>
            </div>
        );
    }
}

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
                    dataKey: 'gcode',
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
                    onColumnResizeEndCallback={::this.onColumnResizeEndCallback}>
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
        data: [], // a list of gcode commands
        alertMessage: '',
        startTime: 0, // unix timestamp
        currentStatus: 'idle', // idle|run
        statusText: '',

        // File Upload
        fileUploading: false,
        percentUploaded: 0, // 0-100

        // Queue Status
        queueStatus: {
            executed: 0,
            total: 0
        }
    };

    uploadData = null;

    componentDidMount() {
        let that = this;

        this.subscribeToEvents();
        this.addSocketEvents();
        this.addSocketIOFileUploadEvents();
    }
    componentWillUnmount() {
        this.removeSocketIOFileUploadEvents();
        this.removeSocketEvents();
        this.unsubscribeFromEvents();
    }
    subscribeToEvents() {
        let that = this;

        this.unsubscribe = store.subscribe(() => {
            let port = _.get(store.getState(), 'port');
            that.setState({ port: port });
        });
    }
    unsubscribeFromEvents() {
        this.unsubscribe();
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

        let changedData = React.addons.update(this.state.data, list);
        this.setState({
            data: changedData,
            queueStatus: {
                executed: Number(data.executed),
                total: Number(data.total)
            }
        });
    }
    addSocketIOFileUploadEvents() {
        siofu.addEventListener('start', ::this.siofuStart);
        siofu.addEventListener('progress', ::this.siofuProgress);
        siofu.addEventListener('complete', ::this.siofuComplete);
        siofu.addEventListener('error', ::this.siofuError);
    }
    removeSocketIOFileUploadEvents() {
        siofu.removeEventListener('start', ::this.siofuOnStart);
        siofu.removeEventListener('progress', ::this.siofuOnProgress);
        siofu.removeEventListener('complete', ::this.siofuOnComplete);
        siofu.removeEventListener('error', ::this.siofuOnError);
    }
    // https://github.com/vote539/socketio-file-upload#start
    siofuStart(event) {
        log.debug('Upload start:', event);

        this.setState({ statusText: i18n._('Uploading file...') });

        event.file.meta.port = this.state.port;
    }
    // Part of the file has been loaded from the file system and
    // ready to be transmitted via Socket.IO.
    // This event can be used to make an upload progress bar.
    // https://github.com/vote539/socketio-file-upload#progress
    siofuProgress(event) {
        let percent = event.bytesLoaded / event.file.size * 100;

        log.trace('File is', percent.toFixed(2), 'percent loaded');

        this.setState({ percentUploaded: Math.floor(percent) });
    }
    // The server has received our file.
    // https://github.com/vote539/socketio-file-upload#complete
    siofuComplete(event) {
        log.debug('Upload complete:', event);

        this.setState({
            fileUploading: false,
            statusText: ''
        });

        if (! event.success) {
            this.showAlert(i18n._('File upload to the server failed.'));
            return;
        }

        // event.detail
        // @param connected
        // @param queueStatus.executed
        // @param queueStatus.total

        if (! event.detail.connected) {
            this.showAlert(i18n._('Upload failed. The port \'{{port}}\' is not open.', { port: this.state.port }));
            return;
        }

        let lines = this.uploadData.split('\n');
        let data = _(lines)
            .map(function(line) {
                return stripComments(line);
            })
            .compact()
            .map(function(line) {
                return {
                    status: GCODE_STATUS.NOT_STARTED,
                    gcode: line
                };
            })
            .value();

        this.setState({
            queueStatus: {
                executed: Number(event.detail.queueStatus.executed),
                total: Number(event.detail.queueStatus.total)
            }
        });

        this.setState({ data: data });
    }
    // The server encountered an error.
    // https://github.com/vote539/socketio-file-upload#complete
    siofuError(event) {
        log.error('Upload file failed:', event);

        this.setState({
            fileUploading: false,
            statusText: i18n._('The file could not be uploaded.')
        });
    }
    showAlert(msg) {
        this.setState({ alertMessage: msg });
    }
    clearAlert() {
        this.setState({ alertMessage: '' });
    }
    handleUpload() {
        let el = React.findDOMNode(this.refs.file);
        if (el) {
            el.value = ''; // Clear file input value
            el.click(); // trigger file input click
        }
    }
    handleFile(e) {
        let that = this;
        let file = e.target.files[0];
        let reader = new FileReader();

        reader.onloadend = (e) => {
            if (e.target.readyState !== FileReader.DONE) {
                return;
            }

            log.debug('FileReader:', _.pick(file, [
                'lastModified',
                'lastModifiedDate',
                'meta',
                'name',
                'size',
                'type'
            ]));

            store.dispatch({ type: GCODE_LOAD, data: e.target.result });

            let files = [file];
            siofu.submitFiles(files);

            // Save uploaded files
            that.uploadData = e.target.result;
        };

        // Clear alert message
        this.clearAlert();

        // Clear uploaded files
        this.uploadData = null;

        // Set uploading state
        this.setState({
            fileUploading: true,
            percentUploaded: 0,
            statusText: i18n._('Starting upload...')
        });

        reader.readAsText(file);
    }
    handleRun() {
        socket.emit('gcode:run', this.state.port);

        let startTime = this.state.startTime || moment().unix(); // use current startTime or current time
        this.setState({
            startTime: startTime,
            currentStatus: 'run'
        });
    }
    handlePause() {
        socket.emit('gcode:pause', this.state.port);
        this.setState({ currentStatus: 'idle' });
    }
    handleStop() {
        socket.emit('gcode:stop', this.state.port);
        this.setState({
            startTime: 0, // reset startTime
            currentStatus: 'idle',
            data: _.map(this.state.data, (item) => {
                // Reset status to NOT_STARTED
                return _.extend({}, item, { status: GCODE_STATUS.NOT_STARTED });
            })
        });
    }
    handleClose() {
        socket.emit('gcode:close', this.state.port);
        store.dispatch({ type: GCODE_UNLOAD });
        this.setState({
            currentStatus: 'idle',
            data: []
        });
    }
    render() {
        let tableWidth = this.props.width - 2 /* border */ - 20 /* padding */;
        let tableHeight = 180;
        let rowHeight = 30;
        let visibleRows = Math.floor(tableHeight / rowHeight);
        let isLoaded = (_.size(this.state.data) > 0);
        let notLoaded = ! isLoaded;
        let canUpload = notLoaded;
        let canRun = isLoaded && (this.state.currentStatus === 'idle');
        let canPause = isLoaded && (this.state.currentStatus === 'run');
        let canStop = isLoaded;
        let canClose = isLoaded && (this.state.currentStatus === 'idle');
        let scrollToRow = Math.min(
            this.state.queueStatus.executed + (Math.floor(visibleRows / 2) - 1),
            this.state.queueStatus.total
        );

        return (
            <div>
                <Alert msg={this.state.alertMessage} dismiss={::this.clearAlert} />
                <div className="btn-toolbar" role="toolbar">
                    <div className="btn-group btn-group-sm" role="group">
                        <button type="button" className="btn btn-default" title={i18n._('Upload G-Code')} onClick={::this.handleUpload} disabled={! canUpload}>
                            <i className="glyphicon glyphicon-cloud-upload"></i>
                            <input type="file" className="hidden" ref="file" onChange={::this.handleFile} />
                        </button>
                        <button type="button" className="btn btn-default" title={i18n._('Run')} onClick={::this.handleRun} disabled={! canRun}>
                            <i className="glyphicon glyphicon-play"></i>
                        </button>
                        <button type="button" className="btn btn-default" title={i18n._('Pause')} onClick={::this.handlePause} disabled={! canPause}>
                            <i className="glyphicon glyphicon-pause"></i>
                        </button>
                        <button type="button" className="btn btn-default" title={i18n._('Stop')} onClick={::this.handleStop} disabled={! canStop}>
                            <i className="glyphicon glyphicon-stop"></i>
                        </button>
                        <button type="button" className="btn btn-default" title={i18n._('Close')} onClick={::this.handleClose} disabled={! canClose}>
                            <i className="glyphicon glyphicon-trash"></i>
                        </button>
                    </div>
                </div>

                <p>{this.state.statusText}</p>

                {this.state.fileUploading &&
                <Progress min="0" max="100" now={this.state.percentUploaded} />
                }

                {isLoaded &&
                <GCodeTable
                    width={tableWidth}
                    height={tableHeight}
                    rowHeight={rowHeight}
                    data={this.state.data}
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
        let width = 300;
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
