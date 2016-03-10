import classNames from 'classnames';
import React from 'react';

const Widget = (props) => {
    const { children, className, borderless, fullscreen, ...others } = props;
    const widgetClass = classNames(
        'widget',
        { 'widget-borderless': !!borderless },
        { 'widget-fullscreen': !!fullscreen },
        className
    );

    return (
        <div {...others} className={widgetClass} data-ns="widget">
            {children}
        </div>
    );
};

Widget.propTypes = {
    children: React.PropTypes.node,
    borderless: React.PropTypes.bool,
    fullscreen: React.PropTypes.bool
};

export default Widget;
