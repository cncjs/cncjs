import _ from 'lodash';
import classNames from 'classnames';
import React from 'react';

class WidgetToolbar extends React.Component {
    render() {
        const { className, ...props } = this.props;
        const widgetToolbarClass = classNames(
            'widget-toolbar',
            className
        );

        return (
            <div {...props} className={widgetToolbarClass}>
                {this.props.children}
            </div>
        );
    }
}

export default WidgetToolbar;
