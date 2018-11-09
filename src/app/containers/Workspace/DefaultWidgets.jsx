import classNames from 'classnames';
import ensureArray from 'ensure-array';
import React, { PureComponent } from 'react';
import config from 'app/store/config';
import Widget from './Widget';
import styles from './widgets.styl';

class DefaultWidgets extends PureComponent {
    render() {
        const { className } = this.props;
        const defaultWidgets = ensureArray(config.get('workspace.container.default.widgets'));
        const widgets = defaultWidgets.map(widgetId => (
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
