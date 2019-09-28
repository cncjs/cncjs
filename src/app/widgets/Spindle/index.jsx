import classNames from 'classnames';
import includes from 'lodash/includes';
import get from 'lodash/get';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import Space from 'app/components/Space';
import Widget from 'app/components/Widget';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import WidgetConfig from 'app/widgets/WidgetConfig';
import {
    // Grbl
    GRBL,
    GRBL_MACHINE_STATE_IDLE,
    GRBL_MACHINE_STATE_HOLD,
    // Marlin
    MARLIN,
    // Smoothie
    SMOOTHIE,
    SMOOTHIE_MACHINE_STATE_IDLE,
    SMOOTHIE_MACHINE_STATE_HOLD,
    // TinyG
    TINYG,
    TINYG_MACHINE_STATE_READY,
    TINYG_MACHINE_STATE_STOP,
    TINYG_MACHINE_STATE_END,
    TINYG_MACHINE_STATE_HOLD,
    // Workflow
    WORKFLOW_STATE_RUN
} from 'app/constants';
import Spindle from './Spindle';
import styles from './index.styl';

class SpindleWidget extends PureComponent {
    static propTypes = {
        widgetId: PropTypes.string.isRequired,
        onFork: PropTypes.func.isRequired,
        onRemove: PropTypes.func.isRequired,
        sortable: PropTypes.object
    };

    // Public methods
    collapse = () => {
        this.setState({ minimized: true });
    };

    expand = () => {
        this.setState({ minimized: false });
    };

    config = new WidgetConfig(this.props.widgetId);

    state = this.getInitialState();

    actions = {
        toggleFullscreen: () => {
            const { minimized, isFullscreen } = this.state;
            this.setState({
                minimized: isFullscreen ? minimized : false,
                isFullscreen: !isFullscreen
            });
        },
        toggleMinimized: () => {
            const { minimized } = this.state;
            this.setState({ minimized: !minimized });
        },
        handleSpindleSpeedChange: (event) => {
            const spindleSpeed = Number(event.target.value) || 0;
            this.setState({ spindleSpeed: spindleSpeed });
        }
    };

    controllerEvents = {
        'serialport:open': (options) => {
            const { port } = options;
            this.setState({ port: port });
        },
        'serialport:close': (options) => {
            const initialState = this.getInitialState();
            this.setState({ ...initialState });
        },
        'workflow:state': (workflowState) => {
            this.setState(state => ({
                workflow: {
                    state: workflowState
                }
            }));
        },
        'controller:state': (type, state) => {
            // Grbl
            if (type === GRBL) {
                const { parserstate } = { ...state };
                const { modal = {} } = { ...parserstate };

                this.setState({
                    controller: {
                        type: type,
                        state: state,
                        modal: {
                            spindle: modal.spindle || '',
                            coolant: modal.coolant || ''
                        }
                    }
                });
            }

            // Marlin
            if (type === MARLIN) {
                const { modal = {} } = { ...state };

                this.setState({
                    controller: {
                        type: type,
                        state: state,
                        modal: {
                            spindle: modal.spindle || '',
                            coolant: modal.coolant || ''
                        }
                    }
                });
            }

            // Smoothie
            if (type === SMOOTHIE) {
                const { parserstate } = { ...state };
                const { modal = {} } = { ...parserstate };

                this.setState({
                    controller: {
                        type: type,
                        state: state,
                        modal: {
                            spindle: modal.spindle || '',
                            coolant: modal.coolant || ''
                        }
                    }
                });
            }

            // TinyG
            if (type === TINYG) {
                const { sr } = { ...state };
                const { modal = {} } = { ...sr };

                this.setState({
                    controller: {
                        type: type,
                        state: state,
                        modal: {
                            spindle: modal.spindle || '',
                            coolant: modal.coolant || ''
                        }
                    }
                });
            }
        }
    };

    componentDidMount() {
        this.addControllerEvents();
    }

    componentWillUnmount() {
        this.removeControllerEvents();
    }

    componentDidUpdate(prevProps, prevState) {
        const {
            minimized,
            spindleSpeed
        } = this.state;

        this.config.set('minimized', minimized);
        this.config.set('speed', spindleSpeed);
    }

    getInitialState() {
        return {
            minimized: this.config.get('minimized', false),
            isFullscreen: false,
            canClick: true, // Defaults to true
            port: controller.port,
            controller: {
                type: controller.type,
                state: controller.state,
                modal: {
                    spindle: '',
                    coolant: ''
                }
            },
            workflow: {
                state: controller.workflow.state
            },
            spindleSpeed: this.config.get('speed', 1000)
        };
    }

    addControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
            const callback = this.controllerEvents[eventName];
            controller.addListener(eventName, callback);
        });
    }

    removeControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
            const callback = this.controllerEvents[eventName];
            controller.removeListener(eventName, callback);
        });
    }

    canClick() {
        const { port, workflow } = this.state;
        const controllerType = this.state.controller.type;
        const controllerState = this.state.controller.state;

        if (!port) {
            return false;
        }
        if (workflow.state === WORKFLOW_STATE_RUN) {
            return false;
        }
        if (!includes([GRBL, MARLIN, SMOOTHIE, TINYG], controllerType)) {
            return false;
        }
        if (controllerType === GRBL) {
            const activeState = get(controllerState, 'status.activeState');
            const states = [
                GRBL_MACHINE_STATE_IDLE,
                GRBL_MACHINE_STATE_HOLD
            ];
            if (!includes(states, activeState)) {
                return false;
            }
        }
        if (controllerType === MARLIN) {
            // Marlin does not have machine state
        }
        if (controllerType === SMOOTHIE) {
            const activeState = get(controllerState, 'status.activeState');
            const states = [
                SMOOTHIE_MACHINE_STATE_IDLE,
                SMOOTHIE_MACHINE_STATE_HOLD
            ];
            if (!includes(states, activeState)) {
                return false;
            }
        }
        if (controllerType === TINYG) {
            const machineState = get(controllerState, 'sr.machineState');
            const states = [
                TINYG_MACHINE_STATE_READY,
                TINYG_MACHINE_STATE_STOP,
                TINYG_MACHINE_STATE_END,
                TINYG_MACHINE_STATE_HOLD
            ];
            if (!includes(states, machineState)) {
                return false;
            }
        }

        return true;
    }

    render() {
        const { widgetId } = this.props;
        const { minimized, isFullscreen } = this.state;
        const isForkedWidget = widgetId.match(/\w+:[\w\-]+/);
        const state = {
            ...this.state,
            canClick: this.canClick()
        };
        const actions = {
            ...this.actions
        };

        return (
            <Widget fullscreen={isFullscreen}>
                <Widget.Header>
                    <Widget.Title>
                        <Widget.Sortable className={this.props.sortable.handleClassName}>
                            <FontAwesomeIcon icon="bars" fixedWidth />
                            <Space width={4} />
                        </Widget.Sortable>
                        {isForkedWidget &&
                        <FontAwesomeIcon icon="code-branch" fixedWidth />
                        }
                        {i18n._('Spindle')}
                    </Widget.Title>
                    <Widget.Controls className={this.props.sortable.filterClassName}>
                        <Widget.Button
                            disabled={isFullscreen}
                            title={minimized ? i18n._('Expand') : i18n._('Collapse')}
                            onClick={actions.toggleMinimized}
                        >
                            {minimized &&
                            <FontAwesomeIcon icon="chevron-down" fixedWidth />
                            }
                            {!minimized &&
                            <FontAwesomeIcon icon="chevron-up" fixedWidth />
                            }
                        </Widget.Button>
                        <Widget.DropdownButton
                            title={i18n._('More')}
                            toggle={(
                                <FontAwesomeIcon icon="ellipsis-v" fixedWidth />
                            )}
                            onSelect={(eventKey) => {
                                if (eventKey === 'fullscreen') {
                                    actions.toggleFullscreen();
                                } else if (eventKey === 'fork') {
                                    this.props.onFork();
                                } else if (eventKey === 'remove') {
                                    this.props.onRemove();
                                }
                            }}
                        >
                            <Widget.DropdownMenuItem eventKey="fullscreen">
                                {!isFullscreen && (
                                    <FontAwesomeIcon icon="expand" fixedWidth />
                                )}
                                {isFullscreen && (
                                    <FontAwesomeIcon icon="compress" fixedWidth />
                                )}
                                <Space width={8} />
                                {!isFullscreen ? i18n._('Enter Full Screen') : i18n._('Exit Full Screen')}
                            </Widget.DropdownMenuItem>
                            <Widget.DropdownMenuItem eventKey="fork">
                                <FontAwesomeIcon icon="code-branch" fixedWidth />
                                <Space width={8} />
                                {i18n._('Fork Widget')}
                            </Widget.DropdownMenuItem>
                            <Widget.DropdownMenuItem eventKey="remove">
                                <FontAwesomeIcon icon="times" fixedWidth />
                                <Space width={8} />
                                {i18n._('Remove Widget')}
                            </Widget.DropdownMenuItem>
                        </Widget.DropdownButton>
                    </Widget.Controls>
                </Widget.Header>
                <Widget.Content
                    className={classNames(
                        styles['widget-content'],
                        { [styles.hidden]: minimized }
                    )}
                >
                    <Spindle
                        state={state}
                        actions={actions}
                    />
                </Widget.Content>
            </Widget>
        );
    }
}

export default SpindleWidget;
