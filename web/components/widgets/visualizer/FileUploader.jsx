import _ from 'lodash';
import i18n from 'i18next';
import Dropzone from 'react-dropzone';
import pubsub from 'pubsub-js';
import React from 'react';
import log from '../../../lib/log';
import siofu from '../../../lib/siofu';

class FileUploader extends React.Component {
    static propTypes = {
        port: React.PropTypes.string,
        onLoad: React.PropTypes.func
    };

    componentDidMount() {
        this.addSocketIOFileUploadEvents();
    }
    componentWillUnmount() {
        this.removeSocketIOFileUploadEvents();
    }
    addSocketIOFileUploadEvents() {
        siofu.addEventListener('start', ::this.siofuStart);
        siofu.addEventListener('progress', ::this.siofuProgress);
        siofu.addEventListener('complete', ::this.siofuComplete);
        siofu.addEventListener('error', ::this.siofuError);
    }
    removeSocketIOFileUploadEvents() {
        siofu.removeEventListener('start', this.siofuOnStart);
        siofu.removeEventListener('progress', this.siofuOnProgress);
        siofu.removeEventListener('complete', this.siofuOnComplete);
        siofu.removeEventListener('error', this.siofuOnError);
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

        event.file.meta.port = this.props.port;
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

        this.props.onLoad();
    }
    // The server encountered an error.
    // https://github.com/vote539/socketio-file-upload#complete
    siofuError(event) {
        this.stopWaiting();

        log.error('Upload file failed:', event);
    }
    onDrop(files) {
        if (!(this.props.port)) {
            return;
        }

        let file = files[0];
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
    onClickToUpload() {
        this.refs.dropzone.open();
    }
    render() {
        let { port } = this.props;
        let canClick = !!port;

        return (
            <div className="file-uploader">
                <Dropzone
                    ref="dropzone"
                    className="dropzone centered"
                    disableClick={true}
                    multiple={false}
                    onDrop={::this.onDrop}
                    disabled={!canClick}
                >
                    <div>
                        <i style={{ fontSize: 48 }} className="glyphicon glyphicon-upload"></i>
                        <h4>{i18n._('Drop G-code file here or click below to upload.')}</h4>
                        <br />
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={::this.onClickToUpload}
                            disabled={!canClick}
                        >
                            {i18n._('Upload G-code')}
                        </button>
                    </div>
                </Dropzone>
            </div>
        );
    }
}

export default FileUploader;
