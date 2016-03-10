import _ from 'lodash';
import pubsub from 'pubsub-js';
import React from 'react';
import store from '../../store';
import Widget from './Widget';

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
        const widgets = _.map(this.state.widgets, (widgetId) => (
            <Widget
                key={widgetId}
                data-widgetid={widgetId}
            />
        ));

        return (
            <div {...this.props}>{widgets}</div>
        );
    }
}

export default DefaultWidgets;
