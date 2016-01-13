import _ from 'lodash';
import classNames from 'classnames';
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

    componentDidMount() {
    }
    componentWillUnmount() {
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
    onChangeFile(event) {
        let files = event.target.files;
        let { port } = this.props;

        if (!port) {
            return;
        }

        let file = files[0];
        let reader = new FileReader();

        reader.onloadend = (event) => {
            let contents = event.target.result,
                error    = event.target.error;

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

            request
                .post('/api/file/upload')
                .send({
                    meta: {
                        name: file.name,
                        size: file.size,
                        port: port
                    },
                    contents: contents
                })
                .end((err, res) => {
                    this.stopWaiting();

                    if (err || !res.ok) {
                        this.setState({ isUploading: false });
                        log.error('Failed to upload file', err, res);
                        return;
                    }

                    pubsub.publish('gcode:load', contents);
                });

        };

        reader.readAsText(file);
    }
    onClickToUpload() {
        this.fileInputEl.value = null;
        this.fileInputEl.click();
    }
    render() {
        let { port } = this.props;
        let { isUploading } = this.state;
        let notUploading = !isUploading;
        let canClick = !!port && notUploading;
        const inputAttributes = {
            type: 'file',
            style: { display: 'none' },
            multiple: false,
            // The ref attribute adds a reference to the component to
            // this.refs when the component is mounted.
            ref: el => this.fileInputEl = el, 
            onChange: ::this.onChangeFile
        };

        return (
            <div className="file-uploader-block">
                <div className="file-uploader-box">
                    <div className="file-uploader-content" disabled={!canClick}>
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
                        <input {...inputAttributes} />
                    </div>
                </div>
            </div>
        );
    }
}

export default FileUploader;
