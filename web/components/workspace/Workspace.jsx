import _ from 'lodash';
import classNames from 'classnames';
import i18n from 'i18next';
import pubsub from 'pubsub-js';
import React from 'react';
import ReactDOM from 'react-dom';
import request from 'superagent';
import Sortable from 'Sortable';
import {
    AxesWidget,
    ConnectionWidget,
    ConsoleWidget,
    GCodeWidget,
    VisualizerWidget,
    GrblWidget,
    SpindleWidget
} from '../widgets';
import log from '../../lib/log';

const widgets = [
    {
        id: 'connection',
        el: <ConnectionWidget data-id="connection" key="connection" />
    },
    {
        id: 'grbl',
        el: <GrblWidget data-id="grbl" key="grbl" />
    },
    {
        id: 'console',
        el: <ConsoleWidget data-id="console" key="console" />
    },
    {
        id: 'axes',
        el: <AxesWidget data-id="axes" key="axes" />
    },
    {
        id: 'spindle',
        el: <SpindleWidget data-id="spindle" key="spindle" />
    },
    {
        id: 'gcode',
        el: <GCodeWidget data-id="gcode" key="gcode" />
    },
    {
        id: 'visualizer',
        el: <VisualizerWidget data-id="visualizer" key="visualizer" />
    }
];

const getWidgetElementById = (id) => {
    let widget = _.findWhere(widgets, { id: id }) || {};
    return widget.el;
};

class Workspace extends React.Component {
    state = {
        showPrimaryContainer: true,
        showSecondaryContainer: true,
        defaultContainer: [],
        primaryContainer: [],
        secondaryContainer: []
    };
    sortableGroup = {
        primary: null,
        secondary: null
    };

    componentDidMount() {
        this.createSortableGroups();

        this.loadSettings((err, settings) => {
            if (err) {
                settings = {};
            }

            let widgetList = _.pluck(widgets, 'id');
            let defaultList = ['visualizer'];
            let primaryDefault = ['connection', 'grbl', 'console'];
            let secondaryDefault = ['axes', 'gcode', 'spindle'];
            let primaryList = _.get(settings, 'workspace.container.primary') || primaryDefault;
            let secondaryList = _.get(settings, 'workspace.container.secondary') || secondaryDefault;

            // primary list
            primaryList = _(primaryList) // Keep the order of primaryList
                .intersection(widgetList) // intersect widgetList
                .difference(defaultList) // exclude defaultList
                .value();

            // secondary list
            secondaryList = _(secondaryList.concat(widgetList)) // Keep the order of secondaryList
                .difference(primaryList) // exclude primaryList
                .difference(defaultList) // exclude defaultList
                .value();

            this.setState({
                defaultContainer: _.map(defaultList, (id) => {
                    return getWidgetElementById(id);
                }),
                primaryContainer: _.map(primaryList, (id) => {
                    return getWidgetElementById(id);
                }),
                secondaryContainer: _.map(secondaryList, (id) => {
                    return getWidgetElementById(id);
                })
            });
        });
    }
    componentWillUnmount() {
        this.destroySortableGroups();
    }
    componentDidUpdate() {
        this.resizeVisualContainer();
    }
    loadSettings(callback) {
        request
            .get('/api/config')
            .end((err, res) => {
                callback(err, res.body || {});
            });
    }
    saveSettings(settings, callback) {
        settings = settings || {};
        request
            .put('/api/config')
            .set('Content-Type', 'application/json')
            .send(settings)
            .end(callback);
    }
    createSortableGroups() {
        const onEndCallback = (evt) => {
            let settings = {
                workspace: {
                    container: {
                        primary: this.sortableGroup['primary'].toArray(),
                        secondary: this.sortableGroup['secondary'].toArray()
                    }
                }
            };

            this.saveSettings(settings, (err, res) => {
                // Publish a 'resize' event
                pubsub.publish('resize'); // Also see "widgets/visualizer.jsx"

                if (err) {
                    log.error(res.text);
                    return;
                }
            });
        };

        { // primary
            let el = ReactDOM.findDOMNode(this.refs.primaryContainer);
            this.sortableGroup['primary'] = Sortable.create(el, {
                group: {
                    name: 'primary',
                    pull: true,
                    put: ['secondary']
                },
                handle: '.btn-drag',
                dataIdAttr: 'data-id',
                onEnd: onEndCallback
            });
        }

        { // secondary
            let el = ReactDOM.findDOMNode(this.refs.secondaryContainer);
            this.sortableGroup['secondary'] = Sortable.create(el, {
                group: {
                    name: 'secondary',
                    pull: true,
                    put: ['primary']
                },
                handle: '.btn-drag',
                dataIdAttr: 'data-id',
                onEnd: onEndCallback
            });
        }
    }
    destroySortableGroups() {
        this.sortableGroup['primary'].destroy();
        this.sortableGroup['secondary'].destroy();
    }
    togglePrimaryContainer() {
        this.setState({ showPrimaryContainer: ! this.state.showPrimaryContainer });

        // Publish a 'resize' event
        pubsub.publish('resize'); // Also see "widgets/visualizer.jsx"
    }
    toggleSecondaryContainer() {
        this.setState({ showSecondaryContainer: ! this.state.showSecondaryContainer });

        // Publish a 'resize' event
        pubsub.publish('resize'); // Also see "widgets/visualizer.jsx"
    }
    resizeVisualContainer() {
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
    render() {
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
                'main-container',
                'fixed'
            )
        };

        return (
            <div className="container-fluid" data-component="Workspace">
                <div className="workspace-container">
                    <div className="workspace-table">
                        <div className="workspace-table-row">
                            <div className={classes.primaryContainer} ref="primaryContainer">
                                {this.state.primaryContainer}
                            </div>
                            <div className="primary-toggler-pane" ref="primaryTogglerPane" onClick={::this.togglePrimaryContainer}></div>
                            <div className={classes.defaultContainer} ref="defaultContainer">
                                {this.state.defaultContainer}
                            </div>
                            <div className="secondary-toggler-pane" ref="secondaryTogglerPane" onClick={::this.toggleSecondaryContainer}></div>
                            <div className={classes.secondaryContainer} ref="secondaryContainer">
                                {this.state.secondaryContainer}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Workspace;
