import classNames from 'classnames';
import _ from 'lodash';
import React, { PureComponent } from 'react';
import store from '../../store';
import Widget from './Widget';
import styles from './widgets.styl';

class DefaultWidgets extends PureComponent {
    render() {
        const { className } = this.props;
        const defaultWidgets = store.get('workspace.container.default.widgets');
        const widgets = _.map(defaultWidgets, (widgetId) => (
            <div data-widget-id={widgetId} key={widgetId}>
                <Widget
                    widgetId={widgetId}
                />
            </div>
        ));

        return (
            <div className={classNames(className, styles.widgets)}>
                {widgets}
            </div>
        );
    }
}

export default DefaultWidgets;
