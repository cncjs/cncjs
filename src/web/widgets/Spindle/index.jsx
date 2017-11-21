import includes from 'lodash/includes';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Space from '../../components/Space';
import Widget from '../../components/Widget';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import WidgetConfig from '../WidgetConfig';
import Spindle from './Spindle';
import {
    // Controller
    GRBL,
    GRBL_MACHINE_STATE_IDLE,
    GRBL_MACHINE_STATE_RUN,
    MARLIN,
    SMOOTHIE,
    SMOOTHIE_MACHINE_STATE_IDLE,
    SMOOTHIE_MACHINE_STATE_RUN,
    TINYG,
    TINYG_MACHINE_STATE_READY,
    TINYG_MACHINE_STATE_STOP,
    TINYG_MACHINE_STATE_END,
    TINYG_MACHINE_STATE_RUN,
    // Workflow
    WORKFLOW_STATE_RUNNING
} from '../../constants';
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
        'connection:open': (options) => {
            const { ident } = options;
            this.setState(state => ({
                connection: {
                    ...state.connection,
                    ident: ident
                }
            }));
        },
        'connection:close': (options) => {
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

            // TinyG
            if (type === TINYG) {
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
            canClick: false,
            controller: {
                type: controller.type,
                state: controller.state,
                modal: {
                    spindle: '',
                    coolant: ''
                }
            },
            connection: {
                ident: controller.connection.ident
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
        const machineState = controller.getMachineState();

        if (!controller.connection.ident) {
            return false;
        }

        if (controller.type === GRBL && !includes([
            GRBL_MACHINE_STATE_IDLE,
            GRBL_MACHINE_STATE_RUN
        ], machineState)) {
            return false;
        }

        if (controller.type === MARLIN) {
            // Marlin does not have machine state
        }

        if (controller.type === SMOOTHIE && !includes([
            SMOOTHIE_MACHINE_STATE_IDLE,
            SMOOTHIE_MACHINE_STATE_RUN
        ], machineState)) {
            return false;
        }

        if (controller.type === TINYG && !includes([
            TINYG_MACHINE_STATE_READY,
            TINYG_MACHINE_STATE_STOP,
            TINYG_MACHINE_STATE_END,
            TINYG_MACHINE_STATE_RUN
        ], machineState)) {
            return false;
        }

        if (controller.workflow.state === WORKFLOW_STATE_RUNNING) {
            return false;
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
                            <i className="fa fa-bars" />
                            <Space width="8" />
                        </Widget.Sortable>
                        {isForkedWidget &&
                        <i className="fa fa-code-fork" style={{ marginRight: 5 }} />
                        }
                        {i18n._('Spindle')}
                    </Widget.Title>
                    <Widget.Controls className={this.props.sortable.filterClassName}>
                        <Widget.Button
                            disabled={isFullscreen}
                            title={minimized ? i18n._('Expand') : i18n._('Collapse')}
                            onClick={actions.toggleMinimized}
                        >
                            <i
                                className={classNames(
                                    'fa',
                                    { 'fa-chevron-up': !minimized },
                                    { 'fa-chevron-down': minimized }
                                )}
                            />
                        </Widget.Button>
                        <Widget.DropdownButton
                            title={i18n._('More')}
                            toggle={<i className="fa fa-ellipsis-v" />}
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
                                <i
                                    className={classNames(
                                        'fa',
                                        'fa-fw',
                                        { 'fa-expand': !isFullscreen },
                                        { 'fa-compress': isFullscreen }
                                    )}
                                />
                                <Space width="4" />
                                {!isFullscreen ? i18n._('Enter Full Screen') : i18n._('Exit Full Screen')}
                            </Widget.DropdownMenuItem>
                            <Widget.DropdownMenuItem eventKey="fork">
                                <i className="fa fa-fw fa-code-fork" />
                                <Space width="4" />
                                {i18n._('Fork Widget')}
                            </Widget.DropdownMenuItem>
                            <Widget.DropdownMenuItem eventKey="remove">
                                <i className="fa fa-fw fa-times" />
                                <Space width="4" />
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
