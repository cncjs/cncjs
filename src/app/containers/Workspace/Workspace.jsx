import _ from 'lodash';
import classNames from 'classnames';
import Dropzone from 'react-dropzone';
import pubsub from 'pubsub-js';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import { withRouter } from 'react-router-dom';
import api from 'app/api';
import { Button, ButtonGroup } from 'app/components/Buttons';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import { Row, Col } from 'app/components/GridSystem';
import Margin from 'app/components/Margin';
import Space from 'app/components/Space';
import {
    WORKFLOW_STATE_IDLE
} from 'app/constants';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import log from 'app/lib/log';
import config from 'app/store/config';
import * as widgetManager from './WidgetManager';
import DefaultWidgets from './DefaultWidgets';
import PrimaryWidgets from './PrimaryWidgets';
import SecondaryWidgets from './SecondaryWidgets';
import FeederPaused from './modals/FeederPaused';
import FeederWait from './modals/FeederWait';
import ServerDisconnected from './modals/ServerDisconnected';
import styles from './index.styl';
import {
    MODAL_NONE,
    MODAL_FEEDER_PAUSED,
    MODAL_FEEDER_WAIT,
    MODAL_SERVER_DISCONNECTED
} from './constants';

const WAIT = '%wait';

const startWaiting = () => {
    // Adds the 'wait' class to <html>
    const root = document.documentElement;
    root.classList.add('wait');
};
const stopWaiting = () => {
    // Adds the 'wait' class to <html>
    const root = document.documentElement;
    root.classList.remove('wait');
};

class Workspace extends PureComponent {
    static propTypes = {
        ...withRouter.propTypes
    };

    state = {
        mounted: false,
        port: '',
        modal: {
            name: MODAL_NONE,
            params: {}
        },
        isDraggingFile: false,
        isDraggingWidget: false,
        isUploading: false,
        showPrimaryContainer: config.get('workspace.container.primary.show'),
        showSecondaryContainer: config.get('workspace.container.secondary.show'),
        inactiveCount: _.size(widgetManager.getInactiveWidgets())
    };
    action = {
        openModal: (name = MODAL_NONE, params = {}) => {
            this.setState(state => ({
                modal: {
                    name: name,
                    params: params
                }
            }));
        },
        closeModal: () => {
            this.setState(state => ({
                modal: {
                    name: MODAL_NONE,
                    params: {}
                }
            }));
        },
        updateModalParams: (params = {}) => {
            this.setState(state => ({
                modal: {
                    ...state.modal,
                    params: {
                        ...state.modal.params,
                        ...params
                    }
                }
            }));
        }
    };
    sortableGroup = {
        primary: null,
        secondary: null
    };
    primaryContainer = null;
    secondaryContainer = null;
    primaryToggler = null;
    secondaryToggler = null;
    primaryWidgets = null;
    secondaryWidgets = null;
    defaultContainer = null;
    controllerEvents = {
        'connect': () => {
            if (controller.connected) {
                this.action.closeModal();
            } else {
                this.action.openModal(MODAL_SERVER_DISCONNECTED);
            }
        },
        'connect_error': () => {
            if (controller.connected) {
                this.action.closeModal();
            } else {
                this.action.openModal(MODAL_SERVER_DISCONNECTED);
            }
        },
        'disconnect': () => {
            if (controller.connected) {
                this.action.closeModal();
            } else {
                this.action.openModal(MODAL_SERVER_DISCONNECTED);
            }
        },
        'serialport:open': (options) => {
            const { port } = options;
            this.setState({ port: port });
        },
        'serialport:close': (options) => {
            this.setState({ port: '' });
        },
        'feeder:status': (status) => {
            const { modal } = this.state;
            const { hold, holdReason } = { ...status };

            if (!hold) {
                if (_.includes([MODAL_FEEDER_PAUSED, MODAL_FEEDER_WAIT], modal.name)) {
                    this.action.closeModal();
                }
                return;
            }

            const { err, data } = { ...holdReason };

            if (err) {
                this.action.openModal(MODAL_FEEDER_PAUSED, {
                    title: i18n._('Error')
                });
                return;
            }

            if (data === WAIT) {
                this.action.openModal(MODAL_FEEDER_WAIT, {
                    title: '%wait'
                });
                return;
            }

            const title = {
                'M0': i18n._('M0 Program Pause'),
                'M1': i18n._('M1 Program Pause'),
                'M2': i18n._('M2 Program End'),
                'M30': i18n._('M30 Program End'),
                'M6': i18n._('M6 Tool Change'),
                'M109': i18n._('M109 Set Extruder Temperature'),
                'M190': i18n._('M190 Set Heated Bed Temperature')
            }[data] || data;

            this.action.openModal(MODAL_FEEDER_PAUSED, {
                title: title
            });
        }
    };
    widgetEventHandler = {
        onForkWidget: (widgetId) => {
            // TODO
        },
        onRemoveWidget: (widgetId) => {
            const inactiveWidgets = widgetManager.getInactiveWidgets();
            this.setState({ inactiveCount: inactiveWidgets.length });
        },
        onDragStart: () => {
            const { isDraggingWidget } = this.state;
            if (!isDraggingWidget) {
                this.setState({ isDraggingWidget: true });
            }
        },
        onDragEnd: () => {
            const { isDraggingWidget } = this.state;
            if (isDraggingWidget) {
                this.setState({ isDraggingWidget: false });
            }
        }
    };

    togglePrimaryContainer = () => {
        const { showPrimaryContainer } = this.state;
        this.setState({ showPrimaryContainer: !showPrimaryContainer });

        // Publish a 'resize' event
        pubsub.publish('resize'); // Also see "widgets/Visualizer"
    };

    toggleSecondaryContainer = () => {
        const { showSecondaryContainer } = this.state;
        this.setState({ showSecondaryContainer: !showSecondaryContainer });

        // Publish a 'resize' event
        pubsub.publish('resize'); // Also see "widgets/Visualizer"
    };

    resizeDefaultContainer = () => {
        const sidebar = document.querySelector('#sidebar');
        const primaryContainer = ReactDOM.findDOMNode(this.primaryContainer);
        const secondaryContainer = ReactDOM.findDOMNode(this.secondaryContainer);
        const primaryToggler = ReactDOM.findDOMNode(this.primaryToggler);
        const secondaryToggler = ReactDOM.findDOMNode(this.secondaryToggler);
        const defaultContainer = ReactDOM.findDOMNode(this.defaultContainer);
        const { showPrimaryContainer, showSecondaryContainer } = this.state;

        { // Mobile-Friendly View
            const { location } = this.props;
            const disableHorizontalScroll = !(showPrimaryContainer && showSecondaryContainer);

            if (location.pathname === '/workspace' && disableHorizontalScroll) {
                // Disable horizontal scroll
                document.body.scrollLeft = 0;
                document.body.style.overflowX = 'hidden';
            } else {
                // Enable horizontal scroll
                document.body.style.overflowX = '';
            }
        }

        if (showPrimaryContainer) {
            defaultContainer.style.left = primaryContainer.offsetWidth + sidebar.offsetWidth + 'px';
        } else {
            defaultContainer.style.left = primaryToggler.offsetWidth + sidebar.offsetWidth + 'px';
        }

        if (showSecondaryContainer) {
            defaultContainer.style.right = secondaryContainer.offsetWidth + 'px';
        } else {
            defaultContainer.style.right = secondaryToggler.offsetWidth + 'px';
        }

        // Publish a 'resize' event
        pubsub.publish('resize'); // Also see "widgets/Visualizer"
    };

    onDrop = (files) => {
        const { port } = this.state;

        if (!port) {
            return;
        }

        let file = files[0];
        let reader = new FileReader();

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

            startWaiting();
            this.setState({ isUploading: true });

            const name = file.name;
            const gcode = result;

            api.loadGCode({ port, name, gcode })
                .then((res) => {
                    const { name = '', gcode = '' } = { ...res.body };
                    pubsub.publish('gcode:load', { name, gcode });
                })
                .catch((res) => {
                    log.error('Failed to upload G-code file');
                })
                .then(() => {
                    stopWaiting();
                    this.setState({ isUploading: false });
                });
        };

        try {
            reader.readAsText(file);
        } catch (err) {
            // Ignore error
        }
    };

    updateWidgetsForPrimaryContainer = () => {
        widgetManager.show(({ activeWidgets, inactiveWidgets }) => {
            const widgets = Object.keys(config.get('widgets', {}))
                .filter(widgetId => {
                    // e.g. "webcam" or "webcam:d8e6352f-80a9-475f-a4f5-3e9197a48a23"
                    const name = widgetId.split(':')[0];
                    return _.includes(activeWidgets, name);
                });

            const defaultWidgets = config.get('workspace.container.default.widgets');
            const sortableWidgets = _.difference(widgets, defaultWidgets);
            let primaryWidgets = config.get('workspace.container.primary.widgets');
            let secondaryWidgets = config.get('workspace.container.secondary.widgets');

            primaryWidgets = sortableWidgets.slice();
            _.pullAll(primaryWidgets, secondaryWidgets);
            pubsub.publish('updatePrimaryWidgets', primaryWidgets);

            secondaryWidgets = sortableWidgets.slice();
            _.pullAll(secondaryWidgets, primaryWidgets);
            pubsub.publish('updateSecondaryWidgets', secondaryWidgets);

            // Update inactive count
            this.setState({ inactiveCount: _.size(inactiveWidgets) });
        });
    };

    updateWidgetsForSecondaryContainer = () => {
        widgetManager.show(({ activeWidgets, inactiveWidgets }) => {
            const widgets = Object.keys(config.get('widgets', {}))
                .filter(widgetId => {
                    // e.g. "webcam" or "webcam:d8e6352f-80a9-475f-a4f5-3e9197a48a23"
                    const name = widgetId.split(':')[0];
                    return _.includes(activeWidgets, name);
                });

            const defaultWidgets = config.get('workspace.container.default.widgets');
            const sortableWidgets = _.difference(widgets, defaultWidgets);
            let primaryWidgets = config.get('workspace.container.primary.widgets');
            let secondaryWidgets = config.get('workspace.container.secondary.widgets');

            secondaryWidgets = sortableWidgets.slice();
            _.pullAll(secondaryWidgets, primaryWidgets);
            pubsub.publish('updateSecondaryWidgets', secondaryWidgets);

            primaryWidgets = sortableWidgets.slice();
            _.pullAll(primaryWidgets, secondaryWidgets);
            pubsub.publish('updatePrimaryWidgets', primaryWidgets);

            // Update inactive count
            this.setState({ inactiveCount: _.size(inactiveWidgets) });
        });
    };

    componentDidMount() {
        this.addControllerEvents();
        this.addResizeEventListener();

        setTimeout(() => {
            // A workaround solution to trigger componentDidUpdate on initial render
            this.setState({ mounted: true });
        }, 0);
    }
    componentWillUnmount() {
        this.removeControllerEvents();
        this.removeResizeEventListener();
    }
    componentDidUpdate() {
        config.set('workspace.container.primary.show', this.state.showPrimaryContainer);
        config.set('workspace.container.secondary.show', this.state.showSecondaryContainer);

        this.resizeDefaultContainer();
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
    addResizeEventListener() {
        this.onResizeThrottled = _.throttle(this.resizeDefaultContainer, 50);
        window.addEventListener('resize', this.onResizeThrottled);
    }
    removeResizeEventListener() {
        window.removeEventListener('resize', this.onResizeThrottled);
        this.onResizeThrottled = null;
    }
    render() {
        const { style, className } = this.props;
        const {
            port,
            modal,
            isDraggingFile,
            isDraggingWidget,
            showPrimaryContainer,
            showSecondaryContainer,
            inactiveCount
        } = this.state;
        const hidePrimaryContainer = !showPrimaryContainer;
        const hideSecondaryContainer = !showSecondaryContainer;

        return (
            <div style={style} className={classNames(className, styles.workspace)}>
                {modal.name === MODAL_FEEDER_PAUSED &&
                <FeederPaused
                    title={modal.params.title}
                    onClose={this.action.closeModal}
                />
                }
                {modal.name === MODAL_FEEDER_WAIT &&
                <FeederWait
                    title={modal.params.title}
                    onClose={this.action.closeModal}
                />
                }
                {modal.name === MODAL_SERVER_DISCONNECTED &&
                <ServerDisconnected />
                }
                <div
                    className={classNames(
                        styles.dropzoneOverlay,
                        { [styles.hidden]: !(port && isDraggingFile) }
                    )}
                >
                    <div className={styles.textBlock}>
                        {i18n._('Drop G-code file here')}
                    </div>
                </div>
                <Dropzone
                    className={styles.dropzone}
                    disabled={controller.workflow.state !== WORKFLOW_STATE_IDLE}
                    disableClick={true}
                    disablePreview={true}
                    multiple={false}
                    onDragStart={(event) => {
                    }}
                    onDragEnter={(event) => {
                        if (controller.workflow.state !== WORKFLOW_STATE_IDLE) {
                            return;
                        }
                        if (isDraggingWidget) {
                            return;
                        }
                        if (!isDraggingFile) {
                            this.setState({ isDraggingFile: true });
                        }
                    }}
                    onDragLeave={(event) => {
                        if (controller.workflow.state !== WORKFLOW_STATE_IDLE) {
                            return;
                        }
                        if (isDraggingWidget) {
                            return;
                        }
                        if (isDraggingFile) {
                            this.setState({ isDraggingFile: false });
                        }
                    }}
                    onDrop={(acceptedFiles, rejectedFiles) => {
                        if (controller.workflow.state !== WORKFLOW_STATE_IDLE) {
                            return;
                        }
                        if (isDraggingWidget) {
                            return;
                        }
                        if (isDraggingFile) {
                            this.setState({ isDraggingFile: false });
                        }
                        this.onDrop(acceptedFiles);
                    }}
                >
                    <div className={styles.workspaceTable}>
                        <div className={styles.workspaceTableRow}>
                            <div
                                ref={node => {
                                    this.primaryContainer = node;
                                }}
                                className={classNames(
                                    styles.primaryContainer,
                                    { [styles.hidden]: hidePrimaryContainer }
                                )}
                            >
                                <Margin top={10} bottom={10}>
                                    <Row>
                                        <Col width="auto">
                                            <Button
                                                btnSize="sm"
                                                onClick={this.togglePrimaryContainer}
                                            >
                                                <FontAwesomeIcon icon="chevron-left" fixedWidth />
                                            </Button>
                                            <Space width={10} />
                                        </Col>
                                        <Col>
                                            <Button
                                                block
                                                btnSize="sm"
                                                onClick={this.updateWidgetsForPrimaryContainer}
                                            >
                                                <FontAwesomeIcon icon="list-alt" />
                                                <Space width={8} />
                                                {i18n._('Manage Widgets ({{inactiveCount}})', {
                                                    inactiveCount: inactiveCount
                                                })}
                                            </Button>
                                        </Col>
                                        <Col width="auto">
                                            <Space width={10} />
                                            <ButtonGroup btnSize="sm">
                                                <Button
                                                    title={i18n._('Collapse All')}
                                                    onClick={event => {
                                                        this.primaryWidgets.collapseAll();
                                                    }}
                                                >
                                                    <FontAwesomeIcon icon="chevron-up" fixedWidth />
                                                </Button>
                                                <Button
                                                    title={i18n._('Expand All')}
                                                    onClick={event => {
                                                        this.primaryWidgets.expandAll();
                                                    }}
                                                >
                                                    <FontAwesomeIcon icon="chevron-down" fixedWidth />
                                                </Button>
                                            </ButtonGroup>
                                        </Col>
                                    </Row>
                                </Margin>
                                <PrimaryWidgets
                                    ref={node => {
                                        this.primaryWidgets = node;
                                    }}
                                    onForkWidget={this.widgetEventHandler.onForkWidget}
                                    onRemoveWidget={this.widgetEventHandler.onRemoveWidget}
                                    onDragStart={this.widgetEventHandler.onDragStart}
                                    onDragEnd={this.widgetEventHandler.onDragEnd}
                                />
                            </div>
                            {hidePrimaryContainer &&
                            <div
                                ref={node => {
                                    this.primaryToggler = node;
                                }}
                                className={styles.primaryToggler}
                            >
                                <Button
                                    btnSize="sm"
                                    onClick={this.togglePrimaryContainer}
                                >
                                    <FontAwesomeIcon icon="chevron-right" fixedWidth />
                                </Button>
                            </div>
                            }
                            <div
                                ref={node => {
                                    this.defaultContainer = node;
                                }}
                                className={classNames(
                                    styles.defaultContainer,
                                    styles.fixed
                                )}
                            >
                                <DefaultWidgets />
                            </div>
                            {hideSecondaryContainer &&
                            <div
                                ref={node => {
                                    this.secondaryToggler = node;
                                }}
                                className={styles.secondaryToggler}
                            >
                                <Button
                                    btnSize="sm"
                                    onClick={this.toggleSecondaryContainer}
                                >
                                    <FontAwesomeIcon icon="chevron-left" fixedWidth />
                                </Button>
                            </div>
                            }
                            <div
                                ref={node => {
                                    this.secondaryContainer = node;
                                }}
                                className={classNames(
                                    styles.secondaryContainer,
                                    { [styles.hidden]: hideSecondaryContainer }
                                )}
                            >
                                <Margin top={10} bottom={10}>
                                    <Row>
                                        <Col width="auto">
                                            <ButtonGroup btnSize="sm">
                                                <Button
                                                    title={i18n._('Collapse All')}
                                                    onClick={event => {
                                                        this.secondaryWidgets.collapseAll();
                                                    }}
                                                >
                                                    <FontAwesomeIcon icon="chevron-up" fixedWidth />
                                                </Button>
                                                <Button
                                                    title={i18n._('Expand All')}
                                                    onClick={event => {
                                                        this.secondaryWidgets.expandAll();
                                                    }}
                                                >
                                                    <FontAwesomeIcon icon="chevron-down" fixedWidth />
                                                </Button>
                                            </ButtonGroup>
                                            <Space width={10} />
                                        </Col>
                                        <Col>
                                            <Button
                                                block
                                                btnSize="sm"
                                                onClick={this.updateWidgetsForSecondaryContainer}
                                            >
                                                <FontAwesomeIcon icon="list-alt" />
                                                <Space width={8} />
                                                {i18n._('Manage Widgets ({{inactiveCount}})', {
                                                    inactiveCount: inactiveCount
                                                })}
                                            </Button>
                                        </Col>
                                        <Col width="auto">
                                            <Space width={10} />
                                            <Button
                                                btnSize="sm"
                                                onClick={this.toggleSecondaryContainer}
                                            >
                                                <FontAwesomeIcon icon="chevron-right" fixedWidth />
                                            </Button>
                                        </Col>
                                    </Row>
                                </Margin>
                                <SecondaryWidgets
                                    ref={node => {
                                        this.secondaryWidgets = node;
                                    }}
                                    onForkWidget={this.widgetEventHandler.onForkWidget}
                                    onRemoveWidget={this.widgetEventHandler.onRemoveWidget}
                                    onDragStart={this.widgetEventHandler.onDragStart}
                                    onDragEnd={this.widgetEventHandler.onDragEnd}
                                />
                            </div>
                        </div>
                    </div>
                </Dropzone>
            </div>
        );
    }
}

export default withRouter(Workspace);
