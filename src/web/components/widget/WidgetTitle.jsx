import classNames from 'classnames';
import React from 'react';

class WidgetTitle extends React.Component {
    static propTypes = {
        children: React.PropTypes.node
    };

    render() {
        const { children, className, ...props } = this.props;
        const widgetTitleClass = classNames(
            'widget-title',
            className
        );

        return (
            <div {...props} className={widgetTitleClass}>
                {children}
            </div>
        );
    }
}

export default WidgetTitle;
