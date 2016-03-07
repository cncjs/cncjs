import classNames from 'classnames';
import React from 'react';

const Toolbar = (props) => {
    const { children, className, ...others } = props;
    const toolbarClass = classNames(
        'widget-toolbar',
        className
    );

    return (
        <div {...others} className={toolbarClass}>
            {children}
        </div>
    );
};

Toolbar.propTypes = {
    children: React.PropTypes.node
};

export default Toolbar;
