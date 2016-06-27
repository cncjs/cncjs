import classNames from 'classnames';
import React from 'react';

const Header = (props) => {
    const { children, className, fixed, ...others } = props;
    const headerClass = classNames(
        'widget-header',
        { 'widget-header-fixed': !!fixed },
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
