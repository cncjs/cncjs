import classNames from 'classnames';
import React from 'react';

const Title = (props) => {
    const { children, className, ...others } = props;
    const titleClass = classNames(
        'widget-title',
        className
    );

    return (
        <div {...others} className={titleClass}>
            {children}
        </div>
    );
};

Title.propTypes = {
    children: React.PropTypes.node
};

export default Title;
