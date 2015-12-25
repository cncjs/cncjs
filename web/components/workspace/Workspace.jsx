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
        mainList: [],
        primaryList: [],
        secondaryList: []
    };

    primarySortableGroup = null;
    secondarySortableGroup = null;
    widgets = {
        'connection': <ConnectionWidget data-id="connection" key="connection" />,
        'grbl': <GrblWidget data-id="grbl" key="grbl" />,
        'console': <ConsoleWidget data-id="console" key="console" />,
        'axes': <AxesWidget data-id="axes" key="axes" />,
        'spindle': <SpindleWidget data-id="spindle" key="spindle" />,
        'gcode': <GCodeWidget data-id="gcode" key="gcode" />,
        'visualizer': <VisualizerWidget data-id="visualizer" key="visualizer" />
    };

    componentDidMount() {
        this.createSortableGroups();

        // TODO: Loading widget settings
        setTimeout(() => {
            this.setState({
                mainList: [
                    this.widgets['visualizer']
                ],
                primaryList: [
                    this.widgets['connection'],
                    this.widgets['grbl'],
                    this.widgets['console']
                ],
                secondaryList: [
                    this.widgets['axes'],
                    this.widgets['spindle'],
                    this.widgets['gcode']
                ]
            });
        }, 0);
    }
    componentWillUnmount() {
        this.destroySortableGroups();
    }
    componentDidUpdate() {
        this.resizeVisualContainer();
    }
    createSortableGroups() {
        { // primary
            let el = ReactDOM.findDOMNode(this.refs.primaryContainer);
            this.primarySortableGroup = Sortable.create(el, {
                group: {
                    name: 'primary',
                    pull: true,
                    put: ['secondary']
                },
                handle: '.btn-drag',
                dataIdAttr: 'data-id',
                onEnd: (evt) => {
                    log.debug(this.primarySortableGroup.toArray());
                    log.debug(this.secondarySortableGroup.toArray());

                    // Publish a 'resize' event
                    pubsub.publish('resize'); // Also see "widgets/visualizer.jsx"
                }
            });
        }
        { // secondary
            let el = ReactDOM.findDOMNode(this.refs.secondaryContainer);
            this.secondarySortableGroup = Sortable.create(el, {
                group: {
                    name: 'secondary',
                    pull: true,
                    put: ['primary']
                },
                handle: '.btn-drag',
                dataIdAttr: 'data-id',
                onEnd: (evt) => {
                    log.debug(this.primarySortableGroup.toArray());
                    log.debug(this.secondarySortableGroup.toArray());

                    // Publish a 'resize' event
                    pubsub.publish('resize'); // Also see "widgets/visualizer.jsx"
                }
            });
        }
    }
    destroySortableGroups() {
        this.primarySortableGroup.destroy();
        this.secondarySortableGroup.destroy();
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
        let mainContainer = ReactDOM.findDOMNode(this.refs.mainContainer);

        mainContainer.style.left = primaryContainer.offsetWidth + primaryTogglerPane.offsetWidth + 'px';
        mainContainer.style.right = secondaryContainer.offsetWidth + secondaryTogglerPane.offsetWidth + 'px';

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
            mainContainer: classNames(
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
                                {this.state.primaryList}
                            </div>
                            <div className="primary-toggler-pane" ref="primaryTogglerPane" onClick={::this.togglePrimaryContainer}></div>
                            <div className={classes.mainContainer} ref="mainContainer">
                                {this.state.mainList}
                            </div>
                            <div className="secondary-toggler-pane" ref="secondaryTogglerPane" onClick={::this.toggleSecondaryContainer}></div>
                            <div className={classes.secondaryContainer} ref="secondaryContainer">
                                {this.state.secondaryList}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Workspace;
