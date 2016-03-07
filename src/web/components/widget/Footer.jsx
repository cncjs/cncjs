import classNames from 'classnames';
import React from 'react';

const Footer = (props) => {
    const { children, className, ...others } = props;
    const footerClass = classNames(
        'widget-footer',
        className
    );

    return (
        <div {...others} className={footerClass}>
            {children}
        </div>
    );
};

Footer.propTypes = {
    children: React.PropTypes.node
};

export default Footer;
