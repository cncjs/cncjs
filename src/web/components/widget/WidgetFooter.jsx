import classNames from 'classnames';
import React from 'react';

class WidgetFooter extends React.Component {
    static propTypes = {
        children: React.PropTypes.node
    };

    render() {
        const { children, className, ...props } = this.props;
        const widgetFooterClass = classNames(
            'widget-footer',
            className
        );

        return (
            <div {...props} className={widgetFooterClass}>
                {children}
            </div>
        );
    }
}

export default WidgetFooter;
