import _ from 'lodash';
import classNames from 'classnames';
import Dropzone from 'react-dropzone';
import pubsub from 'pubsub-js';
import React from 'react';
import ReactDOM from 'react-dom';
import request from 'superagent';
import i18n from '../../lib/i18n';
import log from '../../lib/log';
import store from '../../store';
import * as widgetManager from '../WidgetManager';
import DefaultWidgets from './DefaultWidgets';
import PrimaryWidgets from './PrimaryWidgets';
import SecondaryWidgets from './SecondaryWidgets';

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
    startWaiting() {
        // Adds the 'wait' class to <html>
        let root = document.documentElement;
        root.classList.add('wait');
    }
    stopWaiting() {
        // Adds the 'wait' class to <html>
        let root = document.documentElement;
        root.classList.remove('wait');
    }
    togglePrimaryContainer() {
        const { showPrimaryContainer } = this.state;
        this.setState({ showPrimaryContainer: !showPrimaryContainer });

        // Publish a 'resize' event
        pubsub.publish('resize'); // Also see "widgets/visualizer.jsx"
    }
    toggleSecondaryContainer() {
        const { showSecondaryContainer } = this.state;
        this.setState({ showSecondaryContainer: !showSecondaryContainer });

        // Publish a 'resize' event
        pubsub.publish('resize'); // Also see "widgets/visualizer.jsx"
    }
    resizeDefaultContainer() {
        let primaryContainer = ReactDOM.findDOMNode(this.refs.primaryContainer);
        let secondaryContainer = ReactDOM.findDOMNode(this.refs.secondaryContainer);
        let primaryToggler = ReactDOM.findDOMNode(this.refs.primaryToggler);
        let secondaryToggler = ReactDOM.findDOMNode(this.refs.secondaryToggler);
        let defaultContainer = ReactDOM.findDOMNode(this.refs.defaultContainer);

        if (this.state.showPrimaryContainer) {
            defaultContainer.style.left = primaryContainer.offsetWidth + 'px';
        } else {
            defaultContainer.style.left = primaryToggler.offsetWidth + 'px';
        }

        if (this.state.showSecondaryContainer) {
            defaultContainer.style.right = secondaryContainer.offsetWidth + 'px';
        } else {
            defaultContainer.style.right = secondaryToggler.offsetWidth + 'px';
        }

        // Publish a 'resize' event
        pubsub.publish('resize'); // Also see "widgets/visualizer.jsx"
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

            this.startWaiting();
            this.setState({ isUploading: true });

            const gcode = result;
            request
                .put('/api/gcode')
                .send({
                    port: port,
                    meta: {
                        name: file.name,
                        size: file.size
                    },
                    gcode: gcode
                })
                .end((err, res) => {
                    this.stopWaiting();
                    this.setState({ isUploading: false });

                    if (err || !res.ok) {
                        log.error('Failed to upload file', err, res);
                        return;
                    }

                    pubsub.publish('gcode:load', gcode);
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
    handleDeleteWidget() {
        const { inactiveCount } = this.state;

        // Update inactive count
        this.setState({ inactiveCount: inactiveCount + 1 });
    }
    handleSortStart() {
        const { isDraggingWidget } = this.state;

        if (!isDraggingWidget) {
            this.setState({ isDraggingWidget: true });
        }
    }
    handleSortEnd() {
        const { isDraggingWidget } = this.state;

        if (isDraggingWidget) {
            this.setState({ isDraggingWidget: false });
        }
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
        const classes = {
            primaryContainer: classNames(
                'primary-container',
                { 'hidden': hidePrimaryContainer }
            ),
            secondaryContainer: classNames(
                'secondary-container',
                { 'hidden': hideSecondaryContainer }
            ),
            defaultContainer: classNames(
                'default-container',
                'fixed'
            ),
            dropzoneOverlay: classNames(
                'dropzone-overlay',
                { 'hidden': !(port && isDraggingFile) }
            )
        };

        return (
            <div className="workspace" data-ns="workspace">
                <div className="workspace-container">
                    <div className={classes.dropzoneOverlay}>
                        {i18n._('Drop G-code file here')}
                    </div>
                    <Dropzone
                        ref="dropzone"
                        className="dropzone"
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
                        onDrop={(files) => {
                            if (isDraggingWidget) {
                                return;
                            }
                            if (isDraggingFile) {
                                this.setState({ isDraggingFile: false });
                            }
                            this.onDrop(files);
                        }}
                    >
                        <div className="workspace-table">
                            <div className="workspace-table-row">
                                <div className={classes.primaryContainer} ref="primaryContainer">
                                    <div className="btn-toolbar clearfix" role="toolbar">
                                        <div className="btn-group btn-group-xs pull-left" role="group">
                                            <button
                                                type="button"
                                                className="btn btn-default"
                                                onClick={::this.updateWidgetsForPrimaryContainer}
                                            >
                                                <i className="fa fa-list-alt"></i>&nbsp;
                                                {i18n._('Manage Widgets ({{inactiveCount}})', { inactiveCount: inactiveCount })}
                                            </button>
                                        </div>
                                        <div className="btn-group btn-group-xs pull-right" role="group">
                                            <button
                                                type="button"
                                                className="btn btn-default"
                                                onClick={::this.togglePrimaryContainer}
                                            >
                                                <i className="fa fa-chevron-left"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <PrimaryWidgets
                                        className="widgets"
                                        onDelete={::this.handleDeleteWidget}
                                        onSortStart={::this.handleSortStart}
                                        onSortEnd={::this.handleSortEnd}
                                    />
                                </div>
                            {hidePrimaryContainer &&
                                <div className="primary-toggler" ref="primaryToggler">
                                    <div className="btn-group btn-group-xs">
                                        <button
                                            type="button"
                                            className="btn btn-default"
                                            onClick={::this.togglePrimaryContainer}
                                        >
                                            <i className="fa fa-chevron-right"></i>
                                        </button>
                                    </div>
                                </div>
                            }
                                <div className={classes.defaultContainer} ref="defaultContainer">
                                    <DefaultWidgets className="widgets" />
                                </div>
                            {hideSecondaryContainer &&
                                <div className="secondary-toggler" ref="secondaryToggler">
                                    <div className="btn-group btn-group-xs">
                                        <button
                                            type="button"
                                            className="btn btn-default"
                                            onClick={::this.toggleSecondaryContainer}
                                        >
                                            <i className="fa fa-chevron-left"></i>
                                        </button>
                                    </div>
                                </div>
                            }
                                <div className={classes.secondaryContainer} ref="secondaryContainer">
                                    <div className="btn-toolbar clearfix" role="toolbar">
                                        <div className="btn-group btn-group-xs pull-left" role="group">
                                            <button
                                                type="button"
                                                className="btn btn-default"
                                                onClick={::this.toggleSecondaryContainer}
                                            >
                                                <i className="fa fa-chevron-right"></i>
                                            </button>
                                        </div>
                                        <div className="btn-group btn-group-xs pull-right" role="group">
                                            <button
                                                type="button"
                                                className="btn btn-default"
                                                onClick={::this.updateWidgetsForSecondaryContainer}
                                            >
                                                <i className="fa fa-list-alt"></i>&nbsp;
                                                {i18n._('Manage Widgets ({{inactiveCount}})', { inactiveCount: inactiveCount })}
                                            </button>
                                        </div>
                                    </div>
                                    <SecondaryWidgets
                                        className="widgets"
                                        onDelete={::this.handleDeleteWidget}
                                        onSortStart={::this.handleSortStart}
                                        onSortEnd={::this.handleSortEnd}
                                    />
                                </div>
                            </div>
                        </div>
                    </Dropzone>
                </div>
            </div>
        );
    }
}

export default Workspace;
