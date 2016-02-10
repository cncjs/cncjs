import classNames from 'classnames';
import React from 'react';

class WidgetHeader extends React.Component {
    render() {
        const { className, ...props } = this.props;
        const widgetHeaderClass = classNames(
            'widget-header',
            'clearfix',
            className
        );

        return (
            <div {...props} className={widgetHeaderClass}>
                {this.props.children}
            </div>
        );
    }
}

export default WidgetHeader;
