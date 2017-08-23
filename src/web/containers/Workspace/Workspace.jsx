import _ from 'lodash';
import classNames from 'classnames';
import Dropzone from 'react-dropzone';
import pubsub from 'pubsub-js';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import { withRouter } from 'react-router-dom';
import { Button, ButtonGroup, ButtonToolbar } from '../../components/Buttons';
import Modal from '../../components/Modal';
import api from '../../api';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import log from '../../lib/log';
import store from '../../store';
import * as widgetManager from './WidgetManager';
import DefaultWidgets from './DefaultWidgets';
import PrimaryWidgets from './PrimaryWidgets';
import SecondaryWidgets from './SecondaryWidgets';
import styles from './index.styl';
import {
    WORKFLOW_STATE_IDLE
} from '../../constants';

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
const reloadPage = (forcedReload = true) => {
    // Reload the current page, without using the cache
    window.location.reload(forcedReload);
};

class Workspace extends PureComponent {
    static propTypes = {
        ...withRouter.propTypes
    };

    state = {
        connected: controller.connected,
        mounted: false,
        port: '',
        isDraggingFile: false,
        isDraggingWidget: false,
        isUploading: false,
        showPrimaryContainer: store.get('workspace.container.primary.show'),
        showSecondaryContainer: store.get('workspace.container.secondary.show'),
        inactiveCount: _.size(widgetManager.getInactiveWidgets())
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
            this.setState({ connected: controller.connected });
        },
        'connect_error': () => {
            this.setState({ connected: controller.connected });
        },
        'disconnect': () => {
            this.setState({ connected: controller.connected });
        },
        'serialport:open': (options) => {
            const { port } = options;
            this.setState({ port: port });
        },
        'serialport:close': (options) => {
            this.setState({ port: '' });
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
        store.set('workspace.container.primary.show', this.state.showPrimaryContainer);
        store.set('workspace.container.secondary.show', this.state.showSecondaryContainer);

        this.resizeDefaultContainer();
    }
    addControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
            const callback = this.controllerEvents[eventName];
            controller.on(eventName, callback);
        });
    }
    removeControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
            const callback = this.controllerEvents[eventName];
            controller.off(eventName, callback);
        });
    }
    addResizeEventListener() {
        this.onResizeThrottled = _.throttle(::this.resizeDefaultContainer, 50);
        window.addEventListener('resize', this.onResizeThrottled);
    }
    removeResizeEventListener() {
        window.removeEventListener('resize', this.onResizeThrottled);
        this.onResizeThrottled = null;
    }
    togglePrimaryContainer() {
        const { showPrimaryContainer } = this.state;
        this.setState({ showPrimaryContainer: !showPrimaryContainer });

        // Publish a 'resize' event
        pubsub.publish('resize'); // Also see "widgets/Visualizer"
    }
    toggleSecondaryContainer() {
        const { showSecondaryContainer } = this.state;
        this.setState({ showSecondaryContainer: !showSecondaryContainer });

        // Publish a 'resize' event
        pubsub.publish('resize'); // Also see "widgets/Visualizer"
    }
    resizeDefaultContainer() {
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
    }
    onDrop(files) {
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
    }
    updateWidgetsForPrimaryContainer() {
        widgetManager.show((activeWidgets, inactiveWidgets) => {
            const widgets = Object.keys(store.get('widgets', {}))
                .filter(widgetId => {
                    // e.g. "webcam" or "webcam:d8e6352f-80a9-475f-a4f5-3e9197a48a23"
                    const name = widgetId.split(':')[0];
                    return _.includes(activeWidgets, name);
                });

            const defaultWidgets = store.get('workspace.container.default.widgets');
            const sortableWidgets = _.difference(widgets, defaultWidgets);
            let primaryWidgets = store.get('workspace.container.primary.widgets');
            let secondaryWidgets = store.get('workspace.container.secondary.widgets');

            primaryWidgets = sortableWidgets.slice();
            _.pullAll(primaryWidgets, secondaryWidgets);
            pubsub.publish('updatePrimaryWidgets', primaryWidgets);

            secondaryWidgets = sortableWidgets.slice();
            _.pullAll(secondaryWidgets, primaryWidgets);
            pubsub.publish('updateSecondaryWidgets', secondaryWidgets);

            // Update inactive count
            this.setState({ inactiveCount: _.size(inactiveWidgets) });
        });
    }
    updateWidgetsForSecondaryContainer() {
        widgetManager.show((activeWidgets, inactiveWidgets) => {
            const widgets = Object.keys(store.get('widgets', {}))
                .filter(widgetId => {
                    // e.g. "webcam" or "webcam:d8e6352f-80a9-475f-a4f5-3e9197a48a23"
                    const name = widgetId.split(':')[0];
                    return _.includes(activeWidgets, name);
                });

            const defaultWidgets = store.get('workspace.container.default.widgets');
            const sortableWidgets = _.difference(widgets, defaultWidgets);
            let primaryWidgets = store.get('workspace.container.primary.widgets');
            let secondaryWidgets = store.get('workspace.container.secondary.widgets');

            secondaryWidgets = sortableWidgets.slice();
            _.pullAll(secondaryWidgets, primaryWidgets);
            pubsub.publish('updateSecondaryWidgets', secondaryWidgets);

            primaryWidgets = sortableWidgets.slice();
            _.pullAll(primaryWidgets, secondaryWidgets);
            pubsub.publish('updatePrimaryWidgets', primaryWidgets);

            // Update inactive count
            this.setState({ inactiveCount: _.size(inactiveWidgets) });
        });
    }
    render() {
        const { style, className } = this.props;
        const {
            connected,
            port,
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
                {!connected &&
                <Modal
                    closeOnOverlayClick={false}
                    showCloseButton={false}
                >
                    <Modal.Body>
                        <div style={{ display: 'flex' }}>
                            <i className="fa fa-exclamation-circle fa-4x text-danger" />
                            <div style={{ marginLeft: 25 }}>
                                <h5>{i18n._('Server has stopped working')}</h5>
                                <p>{i18n._('A problem caused the server to stop working correctly. Check out the server status and try again.')}</p>
                            </div>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            btnStyle="primary"
                            onClick={reloadPage}
                        >
                            {i18n._('Reload')}
                        </Button>
                    </Modal.Footer>
                </Modal>
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
                    disabled={controller.workflowState !== WORKFLOW_STATE_IDLE}
                    disableClick={true}
                    disablePreview={true}
                    multiple={false}
                    onDragStart={(event) => {
                    }}
                    onDragEnter={(event) => {
                        if (controller.workflowState !== WORKFLOW_STATE_IDLE) {
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
                        if (controller.workflowState !== WORKFLOW_STATE_IDLE) {
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
                        if (controller.workflowState !== WORKFLOW_STATE_IDLE) {
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
                                <ButtonToolbar style={{ margin: '5px 0' }}>
                                    <div className="pull-left">
                                        <ButtonGroup
                                            btnSize="xs"
                                            btnStyle="flat"
                                        >
                                            <Button
                                                style={{ minWidth: 22 }}
                                                compact
                                                onClick={::this.togglePrimaryContainer}
                                            >
                                                <i className="fa fa-chevron-left" />
                                            </Button>
                                            <Button
                                                onClick={::this.updateWidgetsForPrimaryContainer}
                                            >
                                                <i className="fa fa-list-alt" />
                                                {i18n._('Manage Widgets ({{inactiveCount}})', {
                                                    inactiveCount: inactiveCount
                                                })}
                                            </Button>
                                        </ButtonGroup>
                                    </div>
                                    <div className="pull-right">
                                        <ButtonGroup
                                            btnSize="xs"
                                            btnStyle="flat"
                                        >
                                            <Button
                                                compact
                                                title={i18n._('Collapse All')}
                                                onClick={event => {
                                                    this.primaryWidgets.collapseAll();
                                                }}
                                            >
                                                <i className="fa fa-chevron-up" style={{ fontSize: 14 }} />
                                            </Button>
                                            <Button
                                                compact
                                                title={i18n._('Expand All')}
                                                onClick={event => {
                                                    this.primaryWidgets.expandAll();
                                                }}
                                            >
                                                <i className="fa fa-chevron-down" style={{ fontSize: 14 }} />
                                            </Button>
                                        </ButtonGroup>
                                    </div>
                                </ButtonToolbar>
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
                                <ButtonGroup
                                    btnSize="xs"
                                    btnStyle="flat"
                                >
                                    <Button
                                        style={{ minWidth: 22 }}
                                        compact
                                        onClick={::this.togglePrimaryContainer}
                                    >
                                        <i className="fa fa-chevron-right" />
                                    </Button>
                                </ButtonGroup>
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
                                <ButtonGroup
                                    btnSize="xs"
                                    btnStyle="flat"
                                >
                                    <Button
                                        style={{ minWidth: 22 }}
                                        compact
                                        onClick={::this.toggleSecondaryContainer}
                                    >
                                        <i className="fa fa-chevron-left" />
                                    </Button>
                                </ButtonGroup>
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
                                <ButtonToolbar style={{ margin: '5px 0' }}>
                                    <div className="pull-left">
                                        <ButtonGroup
                                            btnSize="xs"
                                            btnStyle="flat"
                                        >
                                            <Button
                                                compact
                                                title={i18n._('Collapse All')}
                                                onClick={event => {
                                                    this.secondaryWidgets.collapseAll();
                                                }}
                                            >
                                                <i className="fa fa-chevron-up" style={{ fontSize: 14 }} />
                                            </Button>
                                            <Button
                                                compact
                                                title={i18n._('Expand All')}
                                                onClick={event => {
                                                    this.secondaryWidgets.expandAll();
                                                }}
                                            >
                                                <i className="fa fa-chevron-down" style={{ fontSize: 14 }} />
                                            </Button>
                                        </ButtonGroup>
                                    </div>
                                    <div className="pull-right">
                                        <ButtonGroup
                                            btnSize="xs"
                                            btnStyle="flat"
                                        >
                                            <Button
                                                onClick={::this.updateWidgetsForSecondaryContainer}
                                            >
                                                <i className="fa fa-list-alt" />
                                                {i18n._('Manage Widgets ({{inactiveCount}})', {
                                                    inactiveCount: inactiveCount
                                                })}
                                            </Button>
                                            <Button
                                                style={{ minWidth: 22 }}
                                                compact
                                                onClick={::this.toggleSecondaryContainer}
                                            >
                                                <i className="fa fa-chevron-right" />
                                            </Button>
                                        </ButtonGroup>
                                    </div>
                                </ButtonToolbar>
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
