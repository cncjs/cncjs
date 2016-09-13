import _ from 'lodash';
import { ButtonToolbar, ButtonGroup, Button, DropdownButton, MenuItem } from 'react-bootstrap';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import {
    WORKFLOW_STATE_RUNNING,
    WORKFLOW_STATE_PAUSED,
    WORKFLOW_STATE_IDLE
} from '../../constants';
import i18n from '../../lib/i18n';
import styles from './index.styl';

@CSSModules(styles)
class Toolbar extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props);
    }
    render() {
        const { state, actions } = this.props;
        const { canClick, workflowState, renderAnimation } = state;
        const canRun = canClick && _.includes([WORKFLOW_STATE_IDLE, WORKFLOW_STATE_PAUSED], workflowState);
        const canPause = canClick && _.includes([WORKFLOW_STATE_RUNNING], workflowState);
        const canStop = canClick && _.includes([WORKFLOW_STATE_PAUSED], workflowState);
        const canClose = canClick && _.includes([WORKFLOW_STATE_IDLE], workflowState);

        return (
            <ButtonToolbar styleName="toolbar">
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
                        <i className="fa fa-close" style={{ fontSize: 14 }} />
                    </Button>
                </ButtonGroup>
                <ButtonGroup bsSize="sm">
                    <DropdownButton
                        bsSize="sm"
                        title={
                            <i className="fa fa-cog" />
                        }
                        noCaret={true}
                        id="visualizer-dropdown"
                        disabled={!canClick}
                    >
                        <MenuItem header>{i18n._('Options')}</MenuItem>
                        <MenuItem
                            onClick={(event) => {
                                actions.toggleRenderAnimation();
                            }}
                        >
                            {renderAnimation
                                ? <i className="fa fa-toggle-on" />
                                : <i className="fa fa-toggle-off" />
                            }
                            &nbsp;
                            {i18n._('Toggle Toolhead Animation')}
                        </MenuItem>
                    </DropdownButton>
                </ButtonGroup>
            </ButtonToolbar>
        );
    }
}

export default Toolbar;
