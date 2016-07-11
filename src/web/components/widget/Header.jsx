import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';

class Header extends Component {
    static propTypes = {
        fixed: PropTypes.bool
    };
    static defaultProps = {
        fixed: false
    };

    render() {
        const { children, className, fixed, ...others } = this.props;
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
    }
}

export default Header;
