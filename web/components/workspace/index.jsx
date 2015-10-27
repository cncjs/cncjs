import _ from 'lodash';
import i18n from 'i18next';
import pubsub from 'pubsub-js';
import classNames from 'classnames';
import React from 'react';
import Sortable from 'Sortable';
import Widget from '../widget';
import {
    AxesWidget,
    ConnectionWidget,
    ConsoleWidget,
    GCodeWidget,
    GCodeViewerWidget,
    GRBLWidget
} from '../widgets';
import log from '../../lib/log';
import './workspace.css';

export default class Workspace extends React.Component {
    state = {
        showPrimaryContainer: true,
        showSecondaryContainer: true,
        primaryContainer: [
            <ConnectionWidget />,
            <ConsoleWidget />
        ],
        secondaryContainer: [
            <GCodeWidget />,
            <AxesWidget />
        ]
    };

    _sortableGroups = [];

    componentDidMount() {
        this.createSortableGroups();
    }
    componentWillUnmount() {
        this.unsubscribeFromEvents();
    }
    createSortableGroups() {
        this.createSortableGroupForPrimaryContainer(React.findDOMNode(this.refs.primaryContainer));
        this.createSortableGroupForSecondaryContainer(React.findDOMNode(this.refs.secondaryContainer));
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
                pubsub.publish('resize'); // Also see "widgets/gcode-viewer.jsx"
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
                pubsub.publish('resize'); // Also see "widgets/gcode-viewer.jsx"
            }
        });
        this._sortableGroups.push(sortable);

        return sortable;
    }
    componentWillUnmount() {
        this._sortableGroups.each(function(sortable) {
            sortable.destroy();
        });
        this._sortableGroups = [];
    }
    togglePrimaryContainer() {
        this.setState({ showPrimaryContainer: ! this.state.showPrimaryContainer });

        // Publish a 'resize' event
        pubsub.publish('resize'); // Also see "widgets/gcode-viewer.jsx"
    }
    toggleSecondaryContainer() {
        this.setState({ showSecondaryContainer: ! this.state.showSecondaryContainer });

        // Publish a 'resize' event
        pubsub.publish('resize'); // Also see "widgets/gcode-viewer.jsx"
    }
    render() {
        let classes = {
            primaryContainer: classNames(
                'primary-container',
                { 'hidden': ! this.state.showPrimaryContainer }
            ),
            primaryTogglerIcon: classNames(
                'glyphicon',
                { 'glyphicon-chevron-left': this.state.showPrimaryContainer },
                { 'glyphicon-chevron-right': ! this.state.showPrimaryContainer }
            ),
            secondaryContainer: classNames(
                'secondary-container',
                { 'hidden': ! this.state.showSecondaryContainer }
            ),
            secondaryTogglerIcon: classNames(
                'glyphicon',
                { 'glyphicon-chevron-left': ! this.state.showSecondaryContainer },
                { 'glyphicon-chevron-right': this.state.showSecondaryContainer }
            )
        };

        return (
            <div className="container-fluid" data-component="Workspace">
                <div className="workspace-container">
                    <div className="workspace-table">
                        <div className="workspace-table-row">
                            <div className={classes.primaryContainer} ref="primaryContainer">
                                <ConnectionWidget />
                                <GRBLWidget />
                                <ConsoleWidget />
                            </div>
                            <div className="primary-toggler-pane" onClick={::this.togglePrimaryContainer}>
                                <div>
                                    <i className={classes.primaryTogglerIcon}></i>
                                </div>
                            </div>
                            <div className="main-container" ref="main-content">
                                <GCodeViewerWidget />
                            </div>
                            <div className="secondary-toggler-pane" onClick={::this.toggleSecondaryContainer}>
                                <div>
                                    <i className={classes.secondaryTogglerIcon}></i>
                                </div>
                            </div>
                            <div className={classes.secondaryContainer} ref="secondaryContainer">
                                <GCodeWidget />
                                <AxesWidget />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
