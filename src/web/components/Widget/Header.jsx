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
        const { fixed, ...props } = this.props;

        return (
            <div
                {...props}
                styleName={classNames(
                    'widget-header',
                    { 'widget-header-fixed': fixed }
                )}
            />
        );
    }
}

export default Header;
