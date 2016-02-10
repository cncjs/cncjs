import _ from 'lodash';
import classNames from 'classnames';
import Dropzone from 'react-dropzone';
import pubsub from 'pubsub-js';
import React from 'react';
import ReactDOM from 'react-dom';
import request from 'superagent';
import Sortable from '../common/Sortable';
import i18n from '../../lib/i18n';
import log from '../../lib/log';
import store from '../../store';
import * as widgets from './Widgets';
import {
    AxesWidget,
    ConnectionWidget,
    ConsoleWidget,
    GCodeWidget,
    GrblWidget,
    ProbeWidget,
    SpindleWidget,
    VisualizerWidget,
    WebcamWidget
} from '../widgets';

const getWidgetComponent = (widgetId, props) => {
    let handler = {
        'axes': (props) => <AxesWidget {...props} data-id="axes" key="axes" />,
        'connection': (props) => <ConnectionWidget {...props} data-id="connection" key="connection" />,
        'console': (props) => <ConsoleWidget {...props} data-id="console" key="console" />,
        'gcode': (props) => <GCodeWidget {...props} data-id="gcode" key="gcode" />,
        'grbl': (props) => <GrblWidget {...props} data-id="grbl" key="grbl" />,
        'probe': (props) => <ProbeWidget {...props} data-id="probe" key="probe" />,
        'spindle': (props) => <SpindleWidget {...props} data-id="spindle" key="spindle" />,
        'visualizer': (props) => <VisualizerWidget {...props} data-id="visualizer" key="visualizer" />,
        'webcam': (props) => <WebcamWidget {...props} data-id="webcam" key="webcam" />
    }[widgetId];

    return handler ? handler(props) : null;
};

class DefaultWidgets extends React.Component {
    state = {
        widgets: store.get('workspace.container.default.widgets')
    };

    componentDidUpdate() {
        const { widgets } = this.state;
        store.set('workspace.container.default.widgets', widgets);

        // Publish a 'resize' event
        pubsub.publish('resize'); // Also see "widgets/visualizer.jsx"
    }
    render() {
        let widgets = _.map(this.state.widgets, (widgetId) => {
            return getWidgetComponent(widgetId);
        });

        return (
            <div {...this.props}>{widgets}</div>
        );
    }
}

class PrimaryWidgets extends Sortable {
    state = {
        widgets: store.get('workspace.container.primary.widgets')
    };
    sortableOptions = {
        model: 'widgets',
        group: {
            name: 'primary',
            pull: true,
            put: ['secondary']
        },
        handle: '.widget-header',
        dataIdAttr: 'data-id'
    };
    pubsubTokens = [];

    componentDidMount() {
        super.componentDidMount();
        this.subscribe();
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        this.unsubscribe();
    }
    componentDidUpdate() {
        const { widgets } = this.state;

        // Calling store.set() will merge two different arrays into one.
        // Remove the property first to avoid duplication.
        store.unset('workspace.container.primary.widgets');
        store.set('workspace.container.primary.widgets', widgets);

        // Publish a 'resize' event
        pubsub.publish('resize'); // Also see "widgets/visualizer.jsx"
    }
    subscribe() {
        { // updatePrimaryWidgets
            let token = pubsub.subscribe('updatePrimaryWidgets', (msg, widgets) => {
                this.setState({ widgets: widgets });
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
    handleDeleteWidget(widgetId) {
        let widgets = _.slice(this.state.widgets);
        _.remove(widgets, (n) => (n === widgetId));
        this.setState({ widgets: widgets });
    }
    render() {
        let widgets = _.map(this.state.widgets, (widgetId) => {
            return getWidgetComponent(widgetId, {
                onDelete: () => {
                    this.handleDeleteWidget(widgetId);
                }
            });
        });

        return (
            <div {...this.props}>{widgets}</div>
        );
    }
}

class SecondaryWidgets extends Sortable {
    state = {
        widgets: store.get('workspace.container.secondary.widgets')
    };
    sortableOptions = {
        model: 'widgets',
        group: {
            name: 'secondary',
            pull: true,
            put: ['primary']
        },
        handle: '.widget-header',
        dataIdAttr: 'data-id'
    };
    pubsubTokens = [];

    componentDidMount() {
        super.componentDidMount();
        this.subscribe();
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        this.unsubscribe();
    }
    componentDidUpdate() {
        const { widgets } = this.state;

        // Calling store.set() will merge two different arrays into one.
        // Remove the property first to avoid duplication.
        store.unset('workspace.container.secondary.widgets');
        store.set('workspace.container.secondary.widgets', widgets);

        // Publish a 'resize' event
        pubsub.publish('resize'); // Also see "widgets/visualizer.jsx"
    }
    subscribe() {
        { // updateSecondaryWidgets
            let token = pubsub.subscribe('updateSecondaryWidgets', (msg, widgets) => {
                this.setState({ widgets: widgets });
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
    handleDeleteWidget(widgetId) {
        let widgets = _.slice(this.state.widgets);
        _.remove(widgets, (n) => (n === widgetId));
        this.setState({ widgets: widgets });
    }
    render() {
        let widgets = _.map(this.state.widgets, (widgetId) => {
            return getWidgetComponent(widgetId, {
                onDelete: () => {
                    this.handleDeleteWidget(widgetId);
                }
            });
        });

        return (
            <div {...this.props}>{widgets}</div>
        );
    }
}

class Workspace extends React.Component {
    state = {
        mounted: false,
        port: '',
        isDragging: false,
        isUploading: false,
        showPrimaryContainer: store.get('workspace.container.primary.show'),
        showSecondaryContainer: store.get('workspace.container.secondary.show'),
        inactiveCount: _.size(widgets.getInactiveWidgets())
    };
    sortableGroup = {
        primary: null,
        secondary: null
    };

    componentDidMount() {
        this.subscribe();

        setTimeout(() => {
            // A workaround solution to trigger componentDidUpdate on initial render
            this.setState({ mounted: true });
        }, 0);
    }
    componentWillUnmount() {
        this.unsubscribe();
    }
    componentDidUpdate() {
        store.set('workspace.container.primary.show', this.state.showPrimaryContainer);
        store.set('workspace.container.secondary.show', this.state.showSecondaryContainer);

        this.resizeDefaultContainer();
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
                .post('/api/gcode/upload')
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

        reader.readAsText(file);
    }
    updateWidgetsForPrimaryContainer() {
        widgets.show((activeWidgets, inactiveWidgets) => {
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
        widgets.show((activeWidgets, inactiveWidgets) => {
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
            isDragging,
            isUploading,
            showPrimaryContainer,
            showSecondaryContainer,
            showAddWidgets,
            inactiveCount
        } = this.state;
        const notDragging = !isDragging;
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
                { 'hidden': notDragging }
            )
        };

        return (
            <div className="workspace" data-ns="workspace">
                <div className="container-fluid">
                    <div className="workspace-container">
                        <div className={classes.dropzoneOverlay}></div>
                        <Dropzone
                            ref="dropzone"
                            className="dropzone"
                            disableClick={true}
                            multiple={false}
                            onDragEnter={() => {
                                this.setState({ isDragging: true });
                            }}
                            onDragLeave={() => {
                                this.setState({ isDragging: false });
                            }}
                            onDrop={(files) => {
                                this.setState({ isDragging: false });
                                this.onDrop(files);
                            }}
                        >
                            <div className="workspace-table">
                                <div className="workspace-table-row">
                                    <div className={classes.primaryContainer} ref="primaryContainer">
                                        <div className="btn-toolbar clearfix" role="toolbar">
                                            <div className="btn-group btn-group-xs pull-left" role="group">
                                                <button type="button" className="btn btn-default" onClick={::this.updateWidgetsForPrimaryContainer}>
                                                    <i className="fa fa-list-alt"></i>&nbsp;{i18n._('Manage Widgets ({{inactiveCount}})', {inactiveCount: inactiveCount})}
                                                </button>
                                            </div>
                                            <div className="btn-group btn-group-xs pull-right" role="group">
                                                <button type="button" className="btn btn-default" onClick={::this.togglePrimaryContainer}>
                                                    <i className="fa fa-chevron-left"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <PrimaryWidgets className="widgets"/>
                                    </div>
                                    {hidePrimaryContainer &&
                                    <div className="primary-toggler" ref="primaryToggler">
                                        <div className="btn-group btn-group-xs">
                                            <button type="button" className="btn btn-default" onClick={::this.togglePrimaryContainer}>
                                                <i className="fa fa-chevron-right"></i>
                                            </button>
                                        </div>
                                    </div>
                                    }
                                    <div className={classes.defaultContainer} ref="defaultContainer">
                                        <DefaultWidgets className="widgets"/>
                                    </div>
                                    {hideSecondaryContainer &&
                                    <div className="secondary-toggler" ref="secondaryToggler">
                                        <div className="btn-group btn-group-xs">
                                            <button type="button" className="btn btn-default" onClick={::this.toggleSecondaryContainer}>
                                                <i className="fa fa-chevron-left"></i>
                                            </button>
                                        </div>
                                    </div>
                                    }
                                    <div className={classes.secondaryContainer} ref="secondaryContainer">
                                        <div className="btn-toolbar clearfix" role="toolbar">
                                            <div className="btn-group btn-group-xs pull-left" role="group">
                                                <button type="button" className="btn btn-default" onClick={::this.toggleSecondaryContainer}>
                                                    <i className="fa fa-chevron-right"></i>
                                                </button>
                                            </div>
                                            <div className="btn-group btn-group-xs pull-right" role="group">
                                                <button type="button" className="btn btn-default" onClick={::this.updateWidgetsForSecondaryContainer}>
                                                    <i className="fa fa-list-alt"></i>&nbsp;{i18n._('Manage Widgets ({{inactiveCount}})', {inactiveCount: inactiveCount})}
                                                </button>
                                            </div>
                                        </div>
                                        <SecondaryWidgets className="widgets"/>
                                    </div>
                                </div>
                            </div>
                        </Dropzone>
                    </div>
                </div>
            </div>
        );
    }
}

export default Workspace;
