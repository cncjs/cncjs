import _ from 'lodash';
import classNames from 'classnames';
import CSSModules from 'react-css-modules';
import Dropzone from 'react-dropzone';
import pubsub from 'pubsub-js';
import React from 'react';
import ReactDOM from 'react-dom';
import api from '../../api';
import i18n from '../../lib/i18n';
import log from '../../lib/log';
import store from '../../store';
import * as widgetManager from './WidgetManager';
import DefaultWidgets from './DefaultWidgets';
import PrimaryWidgets from './PrimaryWidgets';
import SecondaryWidgets from './SecondaryWidgets';
import styles from './index.styl';

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

@CSSModules(styles, { allowMultiple: true })
class Workspace extends React.Component {
    state = {
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
    widgetEventHandler = {
        onDelete: () => {
            const { inactiveCount } = this.state;

            // Update inactive count
            this.setState({ inactiveCount: inactiveCount + 1 });
        },
        onSortStart: () => {
            const { isDraggingWidget } = this.state;

            if (!isDraggingWidget) {
                this.setState({ isDraggingWidget: true });
            }
        },
        onSortEnd: () => {
            const { isDraggingWidget } = this.state;

            if (isDraggingWidget) {
                this.setState({ isDraggingWidget: false });
            }
        }
    };

    componentDidMount() {
        this.addResizeEventListener();
        this.subscribe();

        setTimeout(() => {
            // A workaround solution to trigger componentDidUpdate on initial render
            this.setState({ mounted: true });
        }, 0);
    }
    componentWillUnmount() {
        this.unsubscribe();
        this.removeResizeEventListener();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state);
    }
    componentDidUpdate() {
        store.set('workspace.container.primary.show', this.state.showPrimaryContainer);
        store.set('workspace.container.secondary.show', this.state.showSecondaryContainer);

        this.resizeDefaultContainer();
    }
    addResizeEventListener() {
        this.onResizeThrottled = _.throttle(::this.resizeDefaultContainer, 10);
        window.addEventListener('resize', this.onResizeThrottled);
    }
    removeResizeEventListener() {
        window.removeEventListener('resize', this.onResizeThrottled);
        this.onResizeThrottled = null;
    }
    subscribe() {
        this.pubsubTokens = [];

        { // port
            let token = pubsub.subscribe('port', (msg, port) => {
                port = port || '';
                this.setState({ port: port });
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
        const primaryContainer = ReactDOM.findDOMNode(this.refs.primaryContainer);
        const secondaryContainer = ReactDOM.findDOMNode(this.refs.secondaryContainer);
        const primaryToggler = ReactDOM.findDOMNode(this.refs.primaryToggler);
        const secondaryToggler = ReactDOM.findDOMNode(this.refs.secondaryToggler);
        const defaultContainer = ReactDOM.findDOMNode(this.refs.defaultContainer);

        if (this.state.showPrimaryContainer) {
            defaultContainer.style.left = primaryContainer.offsetWidth + sidebar.offsetWidth + 'px';
        } else {
            defaultContainer.style.left = primaryToggler.offsetWidth + sidebar.offsetWidth + 'px';
        }

        if (this.state.showSecondaryContainer) {
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
                    pubsub.publish('gcode:load', gcode);
                })
                .catch((err) => {
                    log.error('Failed to upload G-code file:', err);
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
            const defaultWidgets = store.get('workspace.container.default.widgets');
            let primaryWidgets = store.get('workspace.container.primary.widgets');
            let secondaryWidgets = store.get('workspace.container.secondary.widgets');

            // Return a new array of filtered values
            activeWidgets = _.difference(activeWidgets, defaultWidgets);

            primaryWidgets = activeWidgets.slice();
            _.pullAll(primaryWidgets, secondaryWidgets);
            pubsub.publish('updatePrimaryWidgets', primaryWidgets);

            secondaryWidgets = activeWidgets.slice();
            _.pullAll(secondaryWidgets, primaryWidgets);
            pubsub.publish('updateSecondaryWidgets', secondaryWidgets);

            // Update inactive count
            this.setState({ inactiveCount: _.size(inactiveWidgets) });
        });
    }
    updateWidgetsForSecondaryContainer() {
        widgetManager.show((activeWidgets, inactiveWidgets) => {
            const defaultWidgets = store.get('workspace.container.default.widgets');
            let primaryWidgets = store.get('workspace.container.primary.widgets');
            let secondaryWidgets = store.get('workspace.container.secondary.widgets');

            // Return a new array of filtered values
            activeWidgets = _.difference(activeWidgets, defaultWidgets);

            secondaryWidgets = activeWidgets.slice();
            _.pullAll(secondaryWidgets, primaryWidgets);
            pubsub.publish('updateSecondaryWidgets', secondaryWidgets);

            primaryWidgets = activeWidgets.slice();
            _.pullAll(primaryWidgets, secondaryWidgets);
            pubsub.publish('updatePrimaryWidgets', primaryWidgets);

            // Update inactive count
            this.setState({ inactiveCount: _.size(inactiveWidgets) });
        });
    }
    render() {
        const {
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
            <div {...this.props} styleName="workspace">
                <div
                    styleName={classNames(
                        'dropzone-overlay',
                        { 'hidden': !(port && isDraggingFile) }
                    )}
                >
                    <div styleName="text-block">
                        {i18n._('Drop G-code file here')}
                    </div>
                </div>
                <Dropzone
                    ref="dropzone"
                    styleName="dropzone"
                    disableClick={true}
                    multiple={false}
                    onDragStart={(event) => {
                    }}
                    onDragEnter={(event) => {
                        if (isDraggingWidget) {
                            return;
                        }
                        if (!isDraggingFile) {
                            this.setState({ isDraggingFile: true });
                        }
                    }}
                    onDragLeave={(event) => {
                        if (isDraggingWidget) {
                            return;
                        }
                        if (isDraggingFile) {
                            this.setState({ isDraggingFile: false });
                        }
                    }}
                    onDrop={(acceptedFiles, rejectedFiles) => {
                        if (isDraggingWidget) {
                            return;
                        }
                        if (isDraggingFile) {
                            this.setState({ isDraggingFile: false });
                        }
                        this.onDrop(acceptedFiles);
                    }}
                >
                    <div styleName="workspace-table">
                        <div styleName="workspace-table-row">
                            <div
                                styleName={classNames(
                                    'primary-container',
                                    { 'hidden': hidePrimaryContainer }
                                )}
                                ref="primaryContainer"
                            >
                                <div
                                    className="clearfix"
                                    styleName="toolbar"
                                    role="toolbar"
                                >
                                    <div className="btn-group btn-group-xs pull-left" role="group">
                                        <button
                                            type="button"
                                            className="btn btn-default"
                                            onClick={::this.updateWidgetsForPrimaryContainer}
                                        >
                                            <i className="fa fa-list-alt" style={{ verticalAlign: 'middle' }} />
                                            &nbsp;
                                            {i18n._('Manage Widgets ({{inactiveCount}})', { inactiveCount: inactiveCount })}
                                        </button>
                                    </div>
                                    <div className="btn-group btn-group-xs pull-right" role="group">
                                        <button
                                            type="button"
                                            className="btn btn-default"
                                            onClick={::this.togglePrimaryContainer}
                                        >
                                            <i className="fa fa-chevron-left" style={{ verticalAlign: 'middle' }} />
                                        </button>
                                    </div>
                                </div>
                                <PrimaryWidgets
                                    onDelete={this.widgetEventHandler.onDelete}
                                    onSortStart={this.widgetEventHandler.onSortStart}
                                    onSortEnd={this.widgetEventHandler.onSortEnd}
                                />
                            </div>
                            {hidePrimaryContainer &&
                            <div styleName="primary-toggler" ref="primaryToggler">
                                <div className="btn-group btn-group-xs">
                                    <button
                                        type="button"
                                        className="btn btn-default"
                                        onClick={::this.togglePrimaryContainer}
                                    >
                                        <i className="fa fa-chevron-right" style={{ verticalAlign: 'middle' }} />
                                    </button>
                                </div>
                            </div>
                            }
                            <div styleName="default-container fixed" ref="defaultContainer">
                                <DefaultWidgets />
                            </div>
                            {hideSecondaryContainer &&
                            <div styleName="secondary-toggler" ref="secondaryToggler">
                                <div className="btn-group btn-group-xs">
                                    <button
                                        type="button"
                                        className="btn btn-default"
                                        onClick={::this.toggleSecondaryContainer}
                                    >
                                        <i className="fa fa-chevron-left" style={{ verticalAlign: 'middle' }} />
                                    </button>
                                </div>
                            </div>
                            }
                            <div
                                styleName={classNames(
                                    'secondary-container',
                                    { 'hidden': hideSecondaryContainer }
                                )}
                                ref="secondaryContainer"
                            >
                                <div
                                    className="clearfix"
                                    styleName="toolbar"
                                    role="toolbar"
                                >
                                    <div className="btn-group btn-group-xs pull-left" role="group">
                                        <button
                                            type="button"
                                            className="btn btn-default"
                                            onClick={::this.toggleSecondaryContainer}
                                        >
                                            <i className="fa fa-chevron-right" style={{ verticalAlign: 'middle' }} />
                                        </button>
                                    </div>
                                    <div className="btn-group btn-group-xs pull-right" role="group">
                                        <button
                                            type="button"
                                            className="btn btn-default"
                                            onClick={::this.updateWidgetsForSecondaryContainer}
                                        >
                                            <i className="fa fa-list-alt" style={{ verticalAlign: 'middle' }} />
                                            &nbsp;
                                            {i18n._('Manage Widgets ({{inactiveCount}})', { inactiveCount: inactiveCount })}
                                        </button>
                                    </div>
                                </div>
                                <SecondaryWidgets
                                    onDelete={this.widgetEventHandler.onDelete}
                                    onSortStart={this.widgetEventHandler.onSortStart}
                                    onSortEnd={this.widgetEventHandler.onSortEnd}
                                />
                            </div>
                        </div>
                    </div>
                </Dropzone>
            </div>
        );
    }
}

export default Workspace;
