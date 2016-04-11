import _ from 'lodash';
import pubsub from 'pubsub-js';
import React from 'react';
import Sortable from 'react-sortablejs';
import store from '../../store';
import Widget from '../widgets';

export default class SecondaryWidgets extends React.Component {
    static propTypes = {
        onDelete: React.PropTypes.func.isRequired
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
    componentDidUpdate() {
        const { widgets } = this.state;

        // Calling store.set() will merge two different arrays into one.
        // Remove the property first to avoid duplication.
        store.replace('workspace.container.secondary.widgets', widgets);

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
    handleDeleteWidget(widgetid) {
        let widgets = _.slice(this.state.widgets);
        _.remove(widgets, (n) => (n === widgetid));
        this.setState({ widgets: widgets });

        this.props.onDelete();
    }
    render() {
        const widgets = _.map(this.state.widgets, (widgetid) => (
            <Widget
                widgetid={widgetid}
                key={widgetid}
                onDelete={() => {
                    this.handleDeleteWidget(widgetid);
                }}
            />
        ));

        return (
            <Sortable
                {...this.props}
                options={{
                    group: {
                        name: 'secondary',
                        pull: true,
                        put: ['primary']
                    },
                    handle: '.widget-header',
                    dataIdAttr: 'data-widgetid'
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
