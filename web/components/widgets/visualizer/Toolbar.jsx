import _ from 'lodash';
import i18n from 'i18next';
import pubsub from 'pubsub-js';
import React from 'react';
import ReactDOM from 'react-dom';
import log from '../../../lib/log';
import siofu from '../../../lib/siofu';
import socket from '../../../lib/socket';
import {
    WORKFLOW_STATE_RUNNING,
    WORKFLOW_STATE_PAUSED,
    WORKFLOW_STATE_IDLE
} from './constants';

class Toolbar extends React.Component {
    state = {
        port: '',
        isLoaded: false,
        isUploading: false,
        startTime: 0, // unix timestamp
        workflowState: WORKFLOW_STATE_IDLE
    };

    componentDidMount() {
        this.subscribe();
        this.addSocketIOFileUploadEvents();
    }
    componentWillUnmount() {
        this.removeSocketIOFileUploadEvents();
        this.unsubscribe();
    }
    componentDidUpdate() {
        this.props.setWorkflowState(this.state.workflowState);
    }
    subscribe() {
        let that = this;

        this.pubsubTokens = [];

        { // port
            let token = pubsub.subscribe('port', (msg, port) => {
                port = port || '';
                that.setState({ port: port });

                if (!port) {
                    that.reset();
                }

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
    startWaiting() {
        // Adds the 'wait' class to <html>
        let root = document.documentElement;
        root.classList.add('wait');
    }
    stopWaiting() {
        // Adds the 'wait' class to <html>
        let root = document.documentElement;
        root.classList.remove('wait');
    }
    // https://github.com/vote539/socketio-file-upload#start
    siofuStart(event) {
        this.startWaiting();

        log.debug('Upload start:', event);

        event.file.meta.port = this.state.port;

        this.setState({
            isLoading: true
        });
    }
    // Part of the file has been loaded from the file system and
    // ready to be transmitted via Socket.IO.
    // This event can be used to make an upload progress bar.
    // https://github.com/vote539/socketio-file-upload#progress
    siofuProgress(event) {
        let percent = event.bytesLoaded / event.file.size * 100;

        log.trace('File is', percent.toFixed(2), 'percent loaded');
    }
    // The server has received our file.
    // https://github.com/vote539/socketio-file-upload#complete
    siofuComplete(event) {
        this.stopWaiting();

        log.debug('Upload complete:', event);

        if (!(event.success)) {
            log.error('File upload to the server failed.');
            return;
        }

        // event.detail
        // @param connected
        // @param queueStatus.executed
        // @param queueStatus.total

        if (!(event.detail.connected)) {
            log.error('Upload failed. The port is not open.');
            return;
        }

        this.setState({
            isLoaded: true,
            isLoading: false
        });
    }
    // The server encountered an error.
    // https://github.com/vote539/socketio-file-upload#complete
    siofuError(event) {
        this.stopWaiting();

        log.error('Upload file failed:', event);
    }
    handleUpload() {
        let el = ReactDOM.findDOMNode(this.refs.file);
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

            let gcode = e.target.result;
            pubsub.publish('gcode:data', gcode);

            let files = [file];
            siofu.submitFiles(files);
        };

        reader.readAsText(file);
    }
    handleRun() {
        socket.emit('gcode:run', this.state.port);
        pubsub.publish('gcode:run');
        this.setState({
            workflowState: WORKFLOW_STATE_RUNNING
        });
    }
    handlePause() {
        socket.emit('gcode:pause', this.state.port);
        this.setState({
            workflowState: WORKFLOW_STATE_PAUSED
        });
    }
    handleStop() {
        socket.emit('gcode:stop', this.state.port);
        pubsub.publish('gcode:stop');
        this.setState({
            workflowState: WORKFLOW_STATE_IDLE
        });
    }
    handleClose() {
        socket.emit('gcode:close', this.state.port);

        pubsub.publish('gcode:data', '');

        this.setState({
            workflowState: WORKFLOW_STATE_IDLE,
            isLoaded: false
        });
    }
    reset() {
        pubsub.publish('gcode:stop');
        pubsub.publish('gcode:data', '');
        this.setState({
            workflowState: WORKFLOW_STATE_IDLE,
            isLoaded: false
        });
    }
    render() {
        let isLoaded = this.state.isLoaded;
        let notLoading = !(this.state.isLoading);
        let notLoaded = !isLoaded;
        let canUpload = !!this.state.port && notLoading && notLoaded;
        let canRun = isLoaded && _.includes([WORKFLOW_STATE_IDLE, WORKFLOW_STATE_PAUSED], this.state.workflowState);
        let canPause = isLoaded && _.includes([WORKFLOW_STATE_RUNNING], this.state.workflowState);
        let canStop = isLoaded && _.includes([WORKFLOW_STATE_RUNNING, WORKFLOW_STATE_PAUSED], this.state.workflowState);
        let canClose = isLoaded && _.includes([WORKFLOW_STATE_IDLE], this.state.workflowState);

        return (
            <div className="btn-toolbar" role="toolbar">
                <div className="btn-group btn-group-sm" role="group">
                    <button type="button" className="btn btn-primary" title={i18n._('Upload G-code')} onClick={::this.handleUpload} disabled={!canUpload}>
                        <i className="glyphicon glyphicon-upload"></i>
                        &nbsp;{i18n._('Upload G-code')}
                        <input type="file" className="hidden" ref="file" onChange={::this.handleFile} />
                    </button>
                </div>
                <div className="btn-group btn-group-sm" role="group">
                    <button type="button" className="btn btn-default" title={i18n._('Run')} onClick={::this.handleRun} disabled={!canRun}>
                        <i className="glyphicon glyphicon-play"></i>
                    </button>
                    <button type="button" className="btn btn-default" title={i18n._('Pause')} onClick={::this.handlePause} disabled={!canPause}>
                        <i className="glyphicon glyphicon-pause"></i>
                    </button>
                    <button type="button" className="btn btn-default" title={i18n._('Stop')} onClick={::this.handleStop} disabled={!canStop}>
                        <i className="glyphicon glyphicon-stop"></i>
                    </button>
                    <button type="button" className="btn btn-default" title={i18n._('Close')} onClick={::this.handleClose} disabled={!canClose}>
                        <i className="glyphicon glyphicon-trash"></i>
                    </button>
                </div>
            </div>
        );
    }
}

export default Toolbar;
