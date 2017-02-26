import classNames from 'classnames';
import _ from 'lodash';
import React, { Component } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import store from '../../store';
import Widget from './Widget';
import styles from './widgets.styl';

class DefaultWidgets extends Component {
    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        const { className } = this.props;
        const defaultWidgets = store.get('workspace.container.default.widgets');
        const widgets = _.map(defaultWidgets, (widgetid) => (
            <Widget
                widgetid={widgetid}
                key={widgetid}
            />
        ));

        return (
            <div className={classNames(className, styles.widgets)}>
                {widgets}
            </div>
        );
    }
}

export default DefaultWidgets;
