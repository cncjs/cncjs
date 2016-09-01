import _ from 'lodash';
import pubsub from 'pubsub-js';
import React from 'react';
import store from '../../store';
import Widget from './Widget';

class DefaultWidgets extends React.Component {
    state = {
        widgets: store.get('workspace.container.default.widgets')
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state);
    }
    componentDidUpdate() {
        const { widgets } = this.state;
        store.set('workspace.container.default.widgets', widgets);

        // Publish a 'resize' event
        pubsub.publish('resize'); // Also see "widgets/visualizer.jsx"
    }
    render() {
        const widgets = _.map(this.state.widgets, (widgetid) => (
            <Widget
                key={widgetid}
                widgetid={widgetid}
            />
        ));

        return (
            <div {...this.props}>{widgets}</div>
        );
    }
}

export default DefaultWidgets;
