import _ from 'lodash';
import classNames from 'classnames';
import Dropzone from 'react-dropzone';
import pubsub from 'pubsub-js';
import React from 'react';
import ReactDOM from 'react-dom';
import request from 'superagent';
import Sortable from 'sortablejs';
import i18n from '../../lib/i18n';
import log from '../../lib/log';
import ReactSortable from '../../lib/react-sortable';
import store from '../../store';
import {
    AxesWidget,
    ConnectionWidget,
    ConsoleWidget,
    GCodeWidget,
    GrblWidget,
    ProbeWidget,
    SpindleWidget,
    VisualizerWidget
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
        'visualizer': (props) => <VisualizerWidget {...props} data-id="visualizer" key="visualizer" />
    }[widgetId];

    return handler ? handler(props) : null;
};

class DefaultContainer extends React.Component {
    state = {
        widgets: store.get('workspace.container.default')
    };

    componentDidUpdate() {
        let { widgets } = this.state;
        store.set('workspace.container.default', widgets);

        // Publish a 'resize' event
        pubsub.publish('resize'); // Also see "widgets/visualizer.jsx"
    }
    render() {
        let widgets = _.map(this.state.widgets, (widgetId) => {
            return getWidgetComponent(widgetId);
        });

        return (
            <div>{widgets}</div>
        );
    }
}

class PrimaryContainer extends ReactSortable {
    state = {
        widgets: store.get('workspace.container.primary')
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

    componentDidUpdate() {
        let { widgets } = this.state;

        // Calling store.set() will merge two different arrays into one.
        // Remove the property first to avoid duplication.
        store.unset('workspace.container.primary');
        store.set('workspace.container.primary', widgets);

        // Publish a 'resize' event
        pubsub.publish('resize'); // Also see "widgets/visualizer.jsx"
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
            <div>{widgets}</div>
        );
    }
}

class SecondaryContainer extends ReactSortable {
    state = {
        widgets: store.get('workspace.container.secondary')
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

    componentDidUpdate() {
        let { widgets } = this.state;

        // Calling store.set() will merge two different arrays into one.
        // Remove the property first to avoid duplication.
        store.unset('workspace.container.secondary');
        store.set('workspace.container.secondary', widgets);

        // Publish a 'resize' event
        pubsub.publish('resize'); // Also see "widgets/visualizer.jsx"
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
            <div>{widgets}</div>
        );
    }
}

class Workspace extends React.Component {
    state = {
        mounted: false,
        port: '',
        isDragging: false,
        isUploading: false,
        showPrimaryContainer: true,
        showSecondaryContainer: true
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
        let { showPrimaryContainer } = this.state;
        this.setState({ showPrimaryContainer: !showPrimaryContainer });

        // Publish a 'resize' event
        pubsub.publish('resize'); // Also see "widgets/visualizer.jsx"
    }
    toggleSecondaryContainer() {
        let { showSecondaryContainer } = this.state;
        this.setState({ showSecondaryContainer: !showSecondaryContainer });

        // Publish a 'resize' event
        pubsub.publish('resize'); // Also see "widgets/visualizer.jsx"
    }
    resizeDefaultContainer() {
        let primaryContainer = ReactDOM.findDOMNode(this.refs.primaryContainer);
        let primaryTogglerPane = ReactDOM.findDOMNode(this.refs.primaryTogglerPane);
        let secondaryContainer = ReactDOM.findDOMNode(this.refs.secondaryContainer);
        let secondaryTogglerPane = ReactDOM.findDOMNode(this.refs.secondaryTogglerPane);
        let defaultContainer = ReactDOM.findDOMNode(this.refs.defaultContainer);

        defaultContainer.style.left = primaryContainer.offsetWidth + primaryTogglerPane.offsetWidth + 'px';
        defaultContainer.style.right = secondaryContainer.offsetWidth + secondaryTogglerPane.offsetWidth + 'px';

        // Publish a 'resize' event
        pubsub.publish('resize'); // Also see "widgets/visualizer.jsx"
    }
    onDrop(files) {
        let { port } = this.state;

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
    render() {
        let { isDragging, isUploading } = this.state;
        let notDragging = !isDragging;
        let classes = {
            primaryContainer: classNames(
                'primary-container',
                { 'hidden': ! this.state.showPrimaryContainer }
            ),
            secondaryContainer: classNames(
                'secondary-container',
                { 'hidden': ! this.state.showSecondaryContainer }
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
            <div className="container-fluid" data-component="Workspace">
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
                                    <PrimaryContainer />
                                </div>
                                <div className="primary-toggler-pane" ref="primaryTogglerPane" onClick={::this.togglePrimaryContainer}></div>
                                <div className={classes.defaultContainer} ref="defaultContainer">
                                    <DefaultContainer />
                                </div>
                                <div className="secondary-toggler-pane" ref="secondaryTogglerPane" onClick={::this.toggleSecondaryContainer}></div>
                                <div className={classes.secondaryContainer} ref="secondaryContainer">
                                    <SecondaryContainer />
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
