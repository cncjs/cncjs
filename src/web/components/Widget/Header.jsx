import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import styles from './index.styl';

@CSSModules(styles, { allowMultiple: true })
class Header extends Component {
    static propTypes = {
        fixed: PropTypes.bool
    };

    render() {
        const { children, className, fixed, ...others } = this.props;

        return (
            <div
                {...others}
                className={classNames(className, 'clearfix')}
                styleName={classNames(
                    'widget-header',
                    { 'widget-header-fixed': !!fixed }
                )}
            >
                {children}
            </div>
        );
    }
}

export default Header;
