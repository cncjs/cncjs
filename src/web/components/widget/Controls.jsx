import React from 'react';
import classNames from 'classnames';

const Controls = (props) => {
    const { children, className, ...others } = props;
    const controlsClass = classNames(
        'widget-controls',
        className
    );

    return (
        <div {...others} className={controlsClass}>
            {children}
        </div>
    );
};

Controls.propTypes = {
    children: React.PropTypes.node
};

export default Controls;
