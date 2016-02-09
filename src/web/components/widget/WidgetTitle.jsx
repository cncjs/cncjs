import classNames from 'classnames';
import React from 'react';

class WidgetTitle extends React.Component {
    render() {
        const { className, ...props } = this.props;
        const widgetTitleClass = classNames(
            'widget-title',
            className
        );

        return (
            <div {...props} className={widgetTitleClass}>
                {this.props.children}
            </div>
        );
    }
}

export default WidgetTitle;
