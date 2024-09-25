import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Space,
  Text,
} from '@tonic-ui/react';
import _difference from 'lodash/difference';
import _get from 'lodash/get';
import _includes from 'lodash/includes';
import _pick from 'lodash/pick';
import _pullAll from 'lodash/pullAll';
import _size from 'lodash/size';
import _throttle from 'lodash/throttle';
import cx from 'classnames';
import Dropzone from 'react-dropzone';
import pubsub from 'pubsub-js';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import compose from 'recompose/compose';
import styled from 'styled-components';
import api from '@app/api';
import { Button, ButtonGroup } from '@app/components/Buttons';
import { Row, Col } from '@app/components/GridSystem';
import withRouter from '@app/components/withRouter'; // withRouter is deprecated
import {
  CONNECTION_STATE_CONNECTED,
} from '@app/constants/connection';
import {
  WORKFLOW_STATE_IDLE,
} from '@app/constants/workflow';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import log from '@app/lib/log';
import config from '@app/store/config';
import * as widgetManager from './widget-manager';
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

class Workspace extends Component {
  state = {
    modal: {
      name: MODAL_NONE,
      params: {}
    },
    isDraggingWidget: false,
    isUploading: false,
    showPrimaryContainer: config.get('workspace.container.primary.show'),
    showSecondaryContainer: config.get('workspace.container.secondary.show'),
    inactiveCount: _size(widgetManager.getInactiveWidgets())
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
    'feeder:status': (status) => {
      const { modal } = this.state;
      const { hold, holdReason } = { ...status };

      if (!hold) {
        if (_includes([MODAL_FEEDER_PAUSED, MODAL_FEEDER_WAIT], modal.name)) {
          this.action.closeModal();
        }
        return;
      }

      const { err, data, msg } = { ...holdReason };

      if (err) {
        this.action.openModal(MODAL_FEEDER_PAUSED, {
          title: i18n._('Error'),
          message: msg,
        });
        return;
      }

      if (data === WAIT) {
        this.action.openModal(MODAL_FEEDER_WAIT, {
          title: '%wait',
          message: msg,
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
        title: title,
        message: msg,
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
    //const primaryContainer = ReactDOM.findDOMNode(this.primaryContainer);
    //const secondaryContainer = ReactDOM.findDOMNode(this.secondaryContainer);
    //const primaryToggler = ReactDOM.findDOMNode(this.primaryToggler);
    //const secondaryToggler = ReactDOM.findDOMNode(this.secondaryToggler);
    //const defaultContainer = ReactDOM.findDOMNode(this.defaultContainer);
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

    // Publish a 'resize' event
    pubsub.publish('resize'); // Also see "widgets/Visualizer"
  };

  onDrop = (files) => {
    let file = files[0];
    let reader = new FileReader();

    reader.onloadend = (event) => {
      const { result, error } = event.target;

      if (error) {
        log.error(error);
        return;
      }

      log.debug('FileReader:', _pick(file, [
        'lastModified',
        'lastModifiedDate',
        'meta',
        'name',
        'size',
        'type'
      ]));

      startWaiting();
      this.setState({ isUploading: true });

      const meta = {
        name: file.name,
        content: result,
      };

      api.loadGCode(meta)
        .then((res) => {
          const { name } = { ...res.body };
          log.debug(`Loaded a G-code file: name=${name}`);
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
          return _includes(activeWidgets, name);
        });

      const defaultWidgets = config.get('workspace.container.default.widgets');
      const sortableWidgets = _difference(widgets, defaultWidgets);
      let primaryWidgets = config.get('workspace.container.primary.widgets');
      let secondaryWidgets = config.get('workspace.container.secondary.widgets');

      primaryWidgets = sortableWidgets.slice();
      _pullAll(primaryWidgets, secondaryWidgets);
      pubsub.publish('updatePrimaryWidgets', primaryWidgets);

      secondaryWidgets = sortableWidgets.slice();
      _pullAll(secondaryWidgets, primaryWidgets);
      pubsub.publish('updateSecondaryWidgets', secondaryWidgets);

      // Update inactive count
      this.setState({ inactiveCount: _size(inactiveWidgets) });
    });
  };

  updateWidgetsForSecondaryContainer = () => {
    widgetManager.show(({ activeWidgets, inactiveWidgets }) => {
      const widgets = Object.keys(config.get('widgets', {}))
        .filter(widgetId => {
          // e.g. "webcam" or "webcam:d8e6352f-80a9-475f-a4f5-3e9197a48a23"
          const name = widgetId.split(':')[0];
          return _includes(activeWidgets, name);
        });

      const defaultWidgets = config.get('workspace.container.default.widgets');
      const sortableWidgets = _difference(widgets, defaultWidgets);
      let primaryWidgets = config.get('workspace.container.primary.widgets');
      let secondaryWidgets = config.get('workspace.container.secondary.widgets');

      secondaryWidgets = sortableWidgets.slice();
      _pullAll(secondaryWidgets, primaryWidgets);
      pubsub.publish('updateSecondaryWidgets', secondaryWidgets);

      primaryWidgets = sortableWidgets.slice();
      _pullAll(primaryWidgets, secondaryWidgets);
      pubsub.publish('updatePrimaryWidgets', primaryWidgets);

      // Update inactive count
      this.setState({ inactiveCount: _size(inactiveWidgets) });
    });
  };

  componentDidMount() {
    this.addControllerEvents();
    this.addResizeEventListener();

    setTimeout(() => {
      this.resizeDefaultContainer();
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
    this.onResizeThrottled = _throttle(this.resizeDefaultContainer, 50);
    window.addEventListener('resize', this.onResizeThrottled);
  }

  removeResizeEventListener() {
    window.removeEventListener('resize', this.onResizeThrottled);
    this.onResizeThrottled = null;
  }

  render() {
    const {
      isConnected,
      className,
      ...props
    } = this.props;
    const {
      modal,
      isDraggingWidget,
      showPrimaryContainer,
      showSecondaryContainer,
      inactiveCount
    } = this.state;
    const hidePrimaryContainer = !showPrimaryContainer;
    const hideSecondaryContainer = !showSecondaryContainer;

    return (
      <div className={cx(className, styles.workspace)} {...props}>
        {modal.name === MODAL_FEEDER_PAUSED && (
          <FeederPaused
            title={modal.params.title}
            message={modal.params.message}
            onClose={this.action.closeModal}
          />
        )}
        {modal.name === MODAL_FEEDER_WAIT && (
          <FeederWait
            title={modal.params.title}
            message={modal.params.message}
            onClose={this.action.closeModal}
          />
        )}
        {modal.name === MODAL_SERVER_DISCONNECTED &&
          <ServerDisconnected />}
        <Dropzone
          disabled={controller.workflow.state !== WORKFLOW_STATE_IDLE}
          noClick={true}
          multiple={false}
          onDrop={(acceptedFiles, fileRejections, event) => {
            if (!isConnected) {
              return;
            }
            if (controller.workflow.state !== WORKFLOW_STATE_IDLE) {
              return;
            }
            if (isDraggingWidget) {
              return;
            }

            this.onDrop(acceptedFiles);
          }}
        >
          {({
            getRootProps,
            isDragActive,
          }) => (
            <Box {...getRootProps()}>
              {isDragActive && (
                <DropzoneOverlay disabled={!isConnected}>
                  <Text
                    color="#666"
                    size="4xl"
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {isConnected && (
                      <>
                        <FontAwesomeIcon icon="file-upload" size="2x" />
                        <div>{i18n._('Drop file here')}</div>
                      </>
                    )}
                    {!isConnected && (
                      <>
                        <FontAwesomeIcon icon="times-circle" color="#db3d44" size="2x" />
                        <div>{i18n._('You cannot upload files to the workspace when the connection is not established.')}</div>
                      </>
                    )}
                  </Text>
                </DropzoneOverlay>
              )}
              <div className={styles.workspaceTable}>
                <div className={styles.workspaceTableRow}>
                  <div
                    ref={node => {
                      this.primaryContainer = node;
                    }}
                    className={cx(
                      styles.primaryContainer,
                      { [styles.hidden]: hidePrimaryContainer }
                    )}
                  >
                    <Box my="3x">
                      <Row>
                        <Col width="auto">
                          <Button
                            sm
                            onClick={this.togglePrimaryContainer}
                          >
                            <FontAwesomeIcon icon="chevron-left" fixedWidth />
                          </Button>
                          <Space width={10} />
                        </Col>
                        <Col>
                          <Button
                            block
                            sm
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
                          <ButtonGroup sm>
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
                    </Box>
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
                  {hidePrimaryContainer && (
                    <div
                      ref={node => {
                        this.primaryToggler = node;
                      }}
                      className={styles.primaryToggler}
                    >
                      <Button
                        sm
                        onClick={this.togglePrimaryContainer}
                      >
                        <FontAwesomeIcon icon="chevron-right" fixedWidth />
                      </Button>
                    </div>
                  )}
                  <div
                    ref={node => {
                      this.defaultContainer = node;
                    }}
                    className={cx(
                      styles.defaultContainer,
                      styles.fixed
                    )}
                  >
                    <DefaultWidgets />
                  </div>
                  {hideSecondaryContainer && (
                    <div
                      ref={node => {
                        this.secondaryToggler = node;
                      }}
                      className={styles.secondaryToggler}
                    >
                      <Button
                        sm
                        onClick={this.toggleSecondaryContainer}
                      >
                        <FontAwesomeIcon icon="chevron-left" fixedWidth />
                      </Button>
                    </div>
                  )}
                  <div
                    ref={node => {
                      this.secondaryContainer = node;
                    }}
                    className={cx(
                      styles.secondaryContainer,
                      { [styles.hidden]: hideSecondaryContainer }
                    )}
                  >
                    <Box my="3x">
                      <Row>
                        <Col width="auto">
                          <ButtonGroup sm>
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
                            sm
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
                            sm
                            onClick={this.toggleSecondaryContainer}
                          >
                            <FontAwesomeIcon icon="chevron-right" fixedWidth />
                          </Button>
                        </Col>
                      </Row>
                    </Box>
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
            </Box>
          )}
        </Dropzone>
      </div>
    );
  }
}

export default compose(
  withRouter,
  connect(store => {
    const connectionState = _get(store, 'connection.state');
    const isConnected = (connectionState === CONNECTION_STATE_CONNECTED);

    return {
      isConnected,
    };
  }),
)(Workspace);

const DropzoneOverlay = styled(
  ({ disabled, ...props }) => <div {...props} />
)`
    position: fixed;
    top: 60px;
    bottom: 0;
    left: 60px;
    right: 0;
    z-index: 1000;
    background-color: rgba(255, 255, 255, .7);
    border: 4px dashed ${props => (props.disabled ? 'rgba(0, 0, 0, .2)' : '#1e90ff')};
    text-align: center;
    pointer-events: none;
`;
