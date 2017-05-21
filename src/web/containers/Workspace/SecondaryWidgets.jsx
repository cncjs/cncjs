import classNames from 'classnames';
import _ from 'lodash';
import pubsub from 'pubsub-js';
import React, { Component, PropTypes } from 'react';
import Sortable from 'react-sortablejs';
import uuid from 'uuid';
import { GRBL, SMOOTHIE, TINYG } from '../../constants';
import confirm from '../../lib/confirm';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import log from '../../lib/log';
import store from '../../store';
import Widget from './Widget';
import styles from './widgets.styl';

class SecondaryWidgets extends Component {
    static propTypes = {
        onForkWidget: PropTypes.func.isRequired,
        onRemoveWidget: PropTypes.func.isRequired,
        onDragStart: PropTypes.func.isRequired,
        onDragEnd: PropTypes.func.isRequired
    };
    state = {
        widgets: store.get('workspace.container.secondary.widgets')
    };
    forkWidget = (widgetId) => () => {
        confirm({
            title: i18n._('Fork Widget'),
            body: i18n._('Are you sure you want to fork this widget?')
        }).then(() => {
            const name = widgetId.split(':')[0];
            if (!name) {
                log.error(`Failed to fork widget: widgetId=${widgetId}`);
                return;
            }

            // Use the same widget settings in a new widget
            const forkedWidgetId = `${name}:${uuid.v4()}`;
            const defaultSettings = store.get(`widgets["${name}"]`);
            const clonedSettings = store.get(`widgets["${widgetId}"]`, defaultSettings);
            store.set(`widgets["${forkedWidgetId}"]`, clonedSettings);

            const widgets = _.slice(this.state.widgets);
            widgets.push(forkedWidgetId);
            this.setState({ widgets: widgets });

            this.props.onForkWidget(widgetId);
        });
    };
    removeWidget = (widgetId) => () => {
        confirm({
            title: i18n._('Remove Widget'),
            body: i18n._('Are you sure you want to remove this widget?')
        }).then(() => {
            const widgets = _.slice(this.state.widgets);
            _.remove(widgets, (n) => (n === widgetId));
            this.setState({ widgets: widgets });

            if (widgetId.match(/\w+:[\w\-]+/)) {
                // Remove forked widget settings
                store.unset(`widgets["${widgetId}"]`);
            }

            this.props.onRemoveWidget(widgetId);
        });
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
    render() {
        const { className } = this.props;
        const widgets = this.state.widgets
            .filter(widgetId => {
                // e.g. "webcam" or "webcam:d8e6352f-80a9-475f-a4f5-3e9197a48a23"
                const name = widgetId.split(':')[0];
                if (name === 'grbl' && !_.includes(controller.loadedControllers, GRBL)) {
                    return false;
                }
                if (name === 'smoothie' && !_.includes(controller.loadedControllers, SMOOTHIE)) {
                    return false;
                }
                if (name === 'tinyg' && !_.includes(controller.loadedControllers, TINYG)) {
                    return false;
                }
                return true;
            })
            .map(widgetId => (
                <div data-widget-id={widgetId} key={widgetId}>
                    <Widget
                        widgetId={widgetId}
                        onFork={this.forkWidget(widgetId)}
                        onRemove={this.removeWidget(widgetId)}
                        sortable={{
                            handleClassName: 'sortable-handle',
                            filterClassName: 'sortable-filter'
                        }}
                    />
                </div>
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
                    dataIdAttr: 'data-widget-id',
                    onStart: this.props.onDragStart,
                    onEnd: this.props.onDragEnd
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
