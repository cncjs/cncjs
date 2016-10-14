import _ from 'lodash';
import pubsub from 'pubsub-js';
import React, { Component } from 'react';
import CSSModules from 'react-css-modules';
import store from '../../store';
import Widget from './Widget';
import styles from './widgets.styl';

@CSSModules(styles)
class DefaultWidgets extends Component {
    render() {
        const defaultWidgets = store.get('workspace.container.default.widgets');
        const widgets = _.map(defaultWidgets, (widgetid) => (
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
