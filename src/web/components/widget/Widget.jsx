import classNames from 'classnames';
import React from 'react';

class Widget extends React.Component {
    render() {
        const { className, borderless, fullscreen, ...props } = this.props;
        const widgetClass = classNames(
            'widget',
            { 'widget-borderless': !!borderless },
            { 'widget-fullscreen': !!fullscreen },
            className
        );

        return (
            <div {...props} className={widgetClass} data-ns="widget">
                {this.props.children}
            </div>
        );
    }
}

export default Widget;
