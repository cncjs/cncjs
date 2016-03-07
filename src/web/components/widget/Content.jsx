import classNames from 'classnames';
import React from 'react';

const Content = (props) => {
    const { children, className, ...others } = props;
    const contentClass = classNames(
        'widget-content',
        className
    );

    return (
        <div {...others} className={contentClass}>
            {children}
        </div>
    );
};

Content.propTypes = {
    children: React.PropTypes.node
};

export default Content;
