import _ from 'lodash';
import pubsub from 'pubsub-js';
import React, { Component } from 'react';
import CSSModules from 'react-css-modules';
import store from '../../store';
import Widget from './Widget';
import styles from './widgets.styl';

@CSSModules(styles)
class DefaultWidgets extends Component {
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
                widgetid={widgetid}
                key={widgetid}
            />
        ));

        return (
            <div
                {...this.props}
                styleName="widgets"
            >
                {widgets}
            </div>
        );
    }
}

export default DefaultWidgets;
