import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import i18n from '../../../lib/i18n';
import log from '../../../lib/log';
import styles from './index.styl';

@CSSModules(styles, { allowMultiple: true })
class FileUploader extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    onChangeFile(event) {
        const { actions } = this.props;
        const files = event.target.files;
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

            const meta = {
                name: file.name,
                size: file.size
            };
            actions.uploadFile(result, meta);
        };

        try {
            reader.readAsText(file);
        } catch (err) {
            // Ignore error
        }
    }
    onClickToUpload() {
        this.fileInputEl.value = null;
        this.fileInputEl.click();
    }
    render() {
        const { state } = this.props;
        const { port, gcode } = state;
        const disabled = !port || gcode.loading;

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
            <div styleName="file-uploader-block">
                <div styleName="file-uploader-box" ref="file-uploader-box">
                    <div styleName="file-uploader-content" disabled={disabled}>
                        <i style={{ fontSize: 48 }} className="fa fa-arrow-circle-o-up"></i>
                        <p styleName="file-uploader-tips">{i18n._('Drop G-code file here or click below to upload.')}</p>
                        <br />
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={::this.onClickToUpload}
                            disabled={disabled}
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
