import _ from 'lodash';
import i18n from 'i18next';
import pubsub from 'pubsub-js';
import classNames from 'classnames';
import React from 'react';
import ReactDOM from 'react-dom';
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

class Workspace extends React.Component {
    state = {
        showPrimaryContainer: true,
        showSecondaryContainer: true,
        visualContainer: [
            <VisualizerWidget key="visualizer" />
        ],
        primaryContainer: [],
        secondaryContainer: []
    };

    _sortableGroups = [];

    componentDidMount() {
        this.createSortableGroups();

        // TODO: Loading widget settings
        setTimeout(() => {
            this.setState({
                primaryContainer: [
                    <ConnectionWidget key="connection" />,
                    <GrblWidget key="grbl" />,
                    <ConsoleWidget key="console" />
                ],
                secondaryContainer: [
                    <AxesWidget key="axes" />,
                    <SpindleWidget key="spindle" />,
                    <GCodeWidget key="gcode" />
                ]
            });
        }, 0);
    }
    componentWillUnmount() {
        this.unsubscribeFromEvents();

        this._sortableGroups.each(function(sortable) {
            sortable.destroy();
        });
        this._sortableGroups = [];
    }
    componentDidUpdate() {
        this.resizeVisualContainer();
    }
    createSortableGroups() {
        this.createSortableGroupForPrimaryContainer(ReactDOM.findDOMNode(this.refs.primaryContainer));
        this.createSortableGroupForSecondaryContainer(ReactDOM.findDOMNode(this.refs.secondaryContainer));
    }
    createSortableGroupForPrimaryContainer(el) {
        let sortable = Sortable.create(el, {
            group: 'workspace',
            handle: '.btn-drag',
            animation: 150,
            store: {
                get: function(sortable) {
                    let order = localStorage.getItem(sortable.options.group);
                    return order ? order.split('|') : [];
                },
                set: function(sortable) {
                    let order = sortable.toArray();
                    localStorage.setItem(sortable.options.group, order.join('|'));
                }
            },
            onAdd: (evt) => {
                log.trace('onAdd.foo:', [evt.item, evt.from]);
            },
            onUpdate: (evt) => {
                log.trace('onUpdate.foo:', [evt.item, evt.from]);
            },
            onRemove: (evt) => {
                log.trace('onRemove.foo:', [evt.item, evt.from]);
            },
            onStart: (evt) => {
                log.trace('onStart.foo:', [evt.item, evt.from]);
            },
            onSort: (evt) => {
                log.trace('onStart.foo:', [evt.item, evt.from]);
            },
            onEnd: (evt) => {
                log.trace('onEnd.foo:', [evt.item, evt.from]);

                // Publish a 'resize' event
                pubsub.publish('resize'); // Also see "widgets/visualizer.jsx"
            }
        });
        this._sortableGroups.push(sortable);

        return sortable;
    }
    createSortableGroupForSecondaryContainer(el) {
        let sortable = Sortable.create(el, {
            group: 'workspace',
            handle: '.btn-drag',
            animation: 150,
            onAdd: (evt) => {
                log.trace('onAdd.foo:', [evt.item, evt.from]);
            },
            onUpdate: (evt) => {
                log.trace('onUpdate.foo:', [evt.item, evt.from]);
            },
            onRemove: (evt) => {
                log.trace('onRemove.foo:', [evt.item, evt.from]);
            },
            onStart: (evt) => {
                log.trace('onStart.foo:', [evt.item, evt.from]);
            },
            onSort: (evt) => {
                log.trace('onStart.foo:', [evt.item, evt.from]);
            },
            onEnd: (evt) => {
                log.trace('onEnd.foo:', [evt.item, evt.from]);

                // Publish a 'resize' event
                pubsub.publish('resize'); // Also see "widgets/visualizer.jsx"
            }
        });
        this._sortableGroups.push(sortable);

        return sortable;
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
        let visualContainer = ReactDOM.findDOMNode(this.refs.visualContainer);

        visualContainer.style.left = primaryContainer.offsetWidth + primaryTogglerPane.offsetWidth + 'px';
        visualContainer.style.right = secondaryContainer.offsetWidth + secondaryTogglerPane.offsetWidth + 'px';
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
            visualContainer: classNames(
                'visual-container',
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
                            <div className={classes.visualContainer} ref="visualContainer">
                                {this.state.visualContainer}
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
