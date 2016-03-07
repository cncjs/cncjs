import classNames from 'classnames';
import React from 'react';

const Header = (props) => {
    const { children, className, ...others } = props;
    const headerClass = classNames(
        'widget-header',
        'clearfix',
        className
    );

    return (
        <div {...others} className={headerClass}>
            {children}
        </div>
    );
};

Header.propTypes = {
    children: React.PropTypes.node
};

export default Header;
