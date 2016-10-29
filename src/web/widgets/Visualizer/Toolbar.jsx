import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import { ButtonToolbar, ButtonGroup, Button } from 'react-bootstrap';
import CSSModules from 'react-css-modules';
import {
    WORKFLOW_STATE_RUNNING,
    WORKFLOW_STATE_PAUSED,
    WORKFLOW_STATE_IDLE
} from '../../constants';
import i18n from '../../lib/i18n';
import log from '../../lib/log';
import styles from './index.styl';

@CSSModules(styles)
class Toolbar extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };
    fileInputEl = null;

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    onClickToUpload() {
        this.fileInputEl.value = null;
        this.fileInputEl.click();
    }
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
    render() {
        const { state, actions } = this.props;
        const { port, gcode, workflowState } = state;
        const canClick = !!port;
        const isReady = canClick && gcode.ready;
        const canRun = isReady && _.includes([WORKFLOW_STATE_IDLE, WORKFLOW_STATE_PAUSED], workflowState);
        const canPause = isReady && _.includes([WORKFLOW_STATE_RUNNING], workflowState);
        const canStop = isReady && _.includes([WORKFLOW_STATE_PAUSED], workflowState);
        const canClose = isReady && _.includes([WORKFLOW_STATE_IDLE], workflowState);
        const canUpload = isReady ? canClose : (canClick && !gcode.loading);

        return (
            <ButtonToolbar styleName="toolbar">
                <ButtonGroup bsSize="sm" styleName="btn-group">
                    <Button
                        bsStyle="primary"
                        title={i18n._('Upload G-code')}
                        onClick={::this.onClickToUpload}
                        disabled={!canUpload}
                    >
                        {i18n._('Upload G-code')}
                    </Button>
                    <input
                        // The ref attribute adds a reference to the component to
                        // this.refs when the component is mounted.
                        ref={(node) => {
                            this.fileInputEl = node;
                        }}
                        type="file"
                        style={{ display: 'none' }}
                        multiple={false}
                        onChange={::this.onChangeFile}
                    />
                </ButtonGroup>
                <ButtonGroup bsSize="sm" styleName="btn-group">
                    <Button
                        title={i18n._('Run')}
                        onClick={actions.handleRun}
                        disabled={!canRun}
                    >
                        <i className="fa fa-play" />
                    </Button>
                    <Button
                        title={i18n._('Pause')}
                        onClick={actions.handlePause}
                        disabled={!canPause}
                    >
                        <i className="fa fa-pause" />
                    </Button>
                    <Button
                        title={i18n._('Stop')}
                        onClick={actions.handleStop}
                        disabled={!canStop}
                    >
                        <i className="fa fa-stop" />
                    </Button>
                    <Button
                        title={i18n._('Close')}
                        onClick={actions.handleClose}
                        disabled={!canClose}
                    >
                        <i className="fa fa-close" />
                    </Button>
                </ButtonGroup>
            </ButtonToolbar>
        );
    }
}

export default Toolbar;
