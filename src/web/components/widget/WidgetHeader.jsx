import classNames from 'classnames';
import React from 'react';

class WidgetHeader extends React.Component {
    static propTypes = {
        children: React.PropTypes.node
    };

    render() {
        const { children, className, ...props } = this.props;
        const widgetHeaderClass = classNames(
            'widget-header',
            'clearfix',
            className
        );

        return (
            <div {...props} className={widgetHeaderClass}>
                {children}
            </div>
        );
    }
}

export default WidgetHeader;
