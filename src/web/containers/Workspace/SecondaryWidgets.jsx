import classNames from 'classnames';
import _ from 'lodash';
import pubsub from 'pubsub-js';
import React, { Component, PropTypes } from 'react';
import Sortable from 'react-sortablejs';
import { GRBL, SMOOTHIE, TINYG } from '../../constants';
import controller from '../../lib/controller';
import store from '../../store';
import Widget from './Widget';
import styles from './widgets.styl';

class SecondaryWidgets extends Component {
    static propTypes = {
        onDelete: PropTypes.func.isRequired,
        onSortStart: PropTypes.func.isRequired,
        onSortEnd: PropTypes.func.isRequired
    };
    state = {
        widgets: store.get('workspace.container.secondary.widgets')
    };
    pubsubTokens = [];

    componentDidMount() {
        this.subscribe();
    }
    componentWillUnmount() {
        this.unsubscribe();
    }
    shouldComponentUpdate(nextProps, nextState) {
        // Do not compare props for performance considerations
        return !_.isEqual(nextState, this.state);
    }
    componentDidUpdate() {
        const { widgets } = this.state;

        // Calling store.set() will merge two different arrays into one.
        // Remove the property first to avoid duplication.
        store.replace('workspace.container.secondary.widgets', widgets);
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
        this.pubsubTokens.forEach((token) => {
            pubsub.unsubscribe(token);
        });
        this.pubsubTokens = [];
    }
    handleDeleteWidget(widgetid) {
        let widgets = _.slice(this.state.widgets);
        _.remove(widgets, (n) => (n === widgetid));
        this.setState({ widgets: widgets });

        this.props.onDelete();
    }
    render() {
        const { className } = this.props;
        const widgets = this.state.widgets
            .filter(widgetid => {
                if (widgetid === 'grbl' && !_.includes(controller.loadedControllers, GRBL)) {
                    return false;
                }
                if (widgetid === 'smoothie' && !_.includes(controller.loadedControllers, SMOOTHIE)) {
                    return false;
                }
                if (widgetid === 'tinyg' && !_.includes(controller.loadedControllers, TINYG)) {
                    return false;
                }
                return true;
            })
            .map(widgetid => (
                <Widget
                    widgetid={widgetid}
                    key={widgetid}
                    sortable={{
                        handleClassName: 'sortable-handle',
                        filterClassName: 'sortable-filter'
                    }}
                    onDelete={() => {
                        this.handleDeleteWidget(widgetid);
                    }}
                />
            ));

        return (
            <Sortable
                className={classNames(className, styles.widgets)}
                options={{
                    animation: 150,
                    delay: 0, // Touch and hold delay
                    group: {
                        name: 'secondary',
                        pull: true,
                        put: ['primary']
                    },
                    handle: '.sortable-handle', // Drag handle selector within list items
                    filter: '.sortable-filter', // Selectors that do not lead to dragging
                    chosenClass: 'sortable-chosen', // Class name for the chosen item
                    ghostClass: 'sortable-ghost', // Class name for the drop placeholder
                    dataIdAttr: 'data-widgetid',
                    onStart: (event) => {
                        this.props.onSortStart();
                    },
                    onEnd: (event) => {
                        this.props.onSortEnd();
                    }
                }}
                onChange={(order) => {
                    this.setState({ widgets: order });
                }}
            >
                {widgets}
            </Sortable>
        );
    }
}

export default SecondaryWidgets;
