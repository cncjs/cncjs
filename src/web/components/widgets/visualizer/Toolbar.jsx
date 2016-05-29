import _ from 'lodash';
import { ButtonToolbar, ButtonGroup, Button, DropdownButton, MenuItem } from 'react-bootstrap';
import pubsub from 'pubsub-js';
import React from 'react';
import i18n from '../../../lib/i18n';
import controller from '../../../lib/controller';
import store from '../../../store';
import {
    WORKFLOW_STATE_RUNNING,
    WORKFLOW_STATE_PAUSED,
    WORKFLOW_STATE_IDLE,
    ACTIVE_STATE_IDLE
} from './constants';

class Toolbar extends React.Component {
    static propTypes = {
        port: React.PropTypes.string,
        ready: React.PropTypes.bool,
        activeState: React.PropTypes.string,
        setWorkflowState: React.PropTypes.func
    };
    state = {
        workflowState: WORKFLOW_STATE_IDLE,
        gcodeFinished: false,
        renderAnimation: store.get('widgets.visualizer.animation')
    };
    controllerEvents = {
        'gcode:statuschange': (data) => {
            if (data.sent >= data.total) {
                this.setState({ gcodeFinished: true });
            }
        }
    };
    pubsubTokens = [];

    componentDidMount() {
        this.addControllerEvents();
        this.subscribe();
    }
    componentWillUnmount() {
        this.removeControllerEvents();
        this.unsubscribe();
    }
    componentDidUpdate(prevProps, prevState) {
        this.props.setWorkflowState(this.state.workflowState);

        if (store.get('widgets.visualizer.animation') !== this.state.renderAnimation) {
            store.set('widgets.visualizer.animation', this.state.renderAnimation);
        }
    }
    componentWillReceiveProps(nextProps) {
        const { port, activeState } = nextProps;

        if (!port) {
            this.setState({ workflowState: WORKFLOW_STATE_IDLE });
            return;
        }

        if ((this.state.gcodeFinished) && (activeState === ACTIVE_STATE_IDLE)) {
            controller.command('stop');
            pubsub.publish('gcode:stop');
            this.setState({
                workflowState: WORKFLOW_STATE_IDLE,
                gcodeFinished: false
            });
        }
    }
    subscribe() {
        { // setWorkflowState
            const token = pubsub.subscribe('setWorkflowState', (msg, workflowState) => {
                this.setState({ workflowState });
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
    addControllerEvents() {
        _.each(this.controllerEvents, (callback, eventName) => {
            controller.on(eventName, callback);
        });
    }
    removeControllerEvents() {
        _.each(this.controllerEvents, (callback, eventName) => {
            controller.off(eventName, callback);
        });
    }
    handleRun() {
        const { workflowState } = this.state;
        console.assert(_.includes([WORKFLOW_STATE_IDLE, WORKFLOW_STATE_PAUSED], workflowState));

        if (workflowState === WORKFLOW_STATE_PAUSED) {
            controller.command('resume');
            pubsub.publish('gcode:resume');
        } else {
            controller.command('start');
            pubsub.publish('gcode:start');
        }

        this.setState({
            workflowState: WORKFLOW_STATE_RUNNING
        });
    }
    handlePause() {
        const { workflowState } = this.state;
        console.assert(_.includes([WORKFLOW_STATE_RUNNING], workflowState));

        controller.command('pause');
        pubsub.publish('gcode:pause');

        this.setState({
            workflowState: WORKFLOW_STATE_PAUSED
        });
    }
    handleStop() {
        const { workflowState } = this.state;
        console.assert(_.includes([WORKFLOW_STATE_PAUSED], workflowState));

        controller.command('stop');
        controller.command('reset');
        pubsub.publish('gcode:stop');

        this.setState({
            workflowState: WORKFLOW_STATE_IDLE
        });
    }
    handleClose() {
        const { workflowState } = this.state;
        console.assert(_.includes([WORKFLOW_STATE_IDLE], workflowState));

        controller.command('unload');
        pubsub.publish('gcode:unload'); // Unload the G-code

        this.setState({
            workflowState: WORKFLOW_STATE_IDLE
        });
    }
    render() {
        const { port, ready } = this.props;
        const { workflowState, renderAnimation } = this.state;
        const canClick = !!port && ready;
        const canRun = canClick && _.includes([WORKFLOW_STATE_IDLE, WORKFLOW_STATE_PAUSED], workflowState);
        const canPause = canClick && _.includes([WORKFLOW_STATE_RUNNING], workflowState);
        const canStop = canClick && _.includes([WORKFLOW_STATE_PAUSED], workflowState);
        const canClose = canClick && _.includes([WORKFLOW_STATE_IDLE], workflowState);
        const styles = {
            closeIcon: {
                fontSize: 14
            },
            menuIcon: {
                fontSize: 14
            }
        };

        return (
            <ButtonToolbar>
                <ButtonGroup bsSize="sm">
                    <Button
                        title={i18n._('Run')}
                        onClick={::this.handleRun}
                        disabled={!canRun}
                    >
                        <i className="fa fa-play"></i>
                    </Button>
                    <Button
                        title={i18n._('Pause')}
                        onClick={::this.handlePause}
                        disabled={!canPause}
                    >
                        <i className="fa fa-pause"></i>
                    </Button>
                    <Button
                        title={i18n._('Stop')}
                        onClick={::this.handleStop}
                        disabled={!canStop}
                    >
                        <i className="fa fa-stop"></i>
                    </Button>
                    <Button
                        title={i18n._('Close')}
                        onClick={::this.handleClose}
                        disabled={!canClose}
                    >
                        <i className="fa fa-close" style={styles.closeIcon}></i>
                    </Button>
                </ButtonGroup>
                <ButtonGroup bsSize="sm">
                    <DropdownButton
                        bsSize="sm"
                        title={
                            <i className="fa fa-cog"></i>
                        }
                        noCaret={true}
                        id="visualizer-dropdown"
                        disabled={!canClick}
                    >
                        <MenuItem header>{i18n._('Options')}</MenuItem>
                        <MenuItem
                            onClick={(event) => {
                                this.setState({ renderAnimation: !renderAnimation });
                            }}
                        >
                            {renderAnimation
                                ? <i className="fa fa-toggle-on" style={styles.menuIcon}></i>
                                : <i className="fa fa-toggle-off" style={styles.menuIcon}></i>
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
