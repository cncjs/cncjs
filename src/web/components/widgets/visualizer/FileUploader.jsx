import _ from 'lodash';
import pubsub from 'pubsub-js';
import React from 'react';
import request from 'superagent';
import i18n from '../../../lib/i18n';
import log from '../../../lib/log';

class FileUploader extends React.Component {
    static propTypes = {
        port: React.PropTypes.string
    };
    state = {
        isUploading: false
    };

    startWaiting() {
        // Adds the 'wait' class to <html>
        const root = document.documentElement;
        root.classList.add('wait');
    }
    stopWaiting() {
        // Adds the 'wait' class to <html>
        const root = document.documentElement;
        root.classList.remove('wait');
    }
    onChangeFile(event) {
        const files = event.target.files;
        const { port } = this.props;

        if (!port) {
            return;
        }

        const file = files[0];
        const reader = new FileReader();

        reader.onloadend = (event) => {
            const { result, error } = event.target;

            if (error) {
                log.error(error);
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

            this.startWaiting();
            this.setState({ isUploading: true });

            const gcode = result;
            request
                .post('/api/gcode/upload')
                .send({
                    port,
                    meta: {
                        name: file.name,
                        size: file.size
                    },
                    gcode
                })
                .end((err, res) => {
                    this.stopWaiting();

                    if (err || !res.ok) {
                        this.setState({ isUploading: false });
                        log.error('Failed to upload file', err, res);
                        return;
                    }

                    pubsub.publish('gcode:load', gcode);
                });
        };

        reader.readAsText(file);
    }
    onClickToUpload() {
        this.fileInputEl.value = null;
        this.fileInputEl.click();
    }
    render() {
        const { port } = this.props;
        const { isUploading } = this.state;
        const notUploading = !isUploading;
        const canClick = !!port && notUploading;
        const inputAttributes = {
            type: 'file',
            style: { display: 'none' },
            multiple: false,
            // The ref attribute adds a reference to the component to
            // this.refs when the component is mounted.
            ref: (el) => {
                this.fileInputEl = el;
                return el;
            },
            onChange: ::this.onChangeFile
        };

        return (
            <div className="file-uploader-block">
                <div className="file-uploader-box" ref="file-uploader-box">
                    <div className="file-uploader-content" disabled={!canClick}>
                        <i style={{ fontSize: 48 }} className="fa fa-arrow-circle-o-up"></i>
                        <p className="file-uploader-tips">{i18n._('Drop G-code file here or click below to upload.')}</p>
                        <br />
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={::this.onClickToUpload}
                            disabled={!canClick}
                        >
                            {i18n._('Upload G-code')}
                        </button>
                        <input {...inputAttributes} />
                    </div>
                </div>
            </div>
        );
    }
}

export default FileUploader;
