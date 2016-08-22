import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import styles from './index.styl';

@CSSModules(styles)
class TogglerIcon extends Component {
    static propTypes = {
        expanded: PropTypes.bool
    };
    static defaultProps = {
        expanded: false
    };

    render() {
        const { className, expanded, ...props } = this.props;

        return (
            <i
                {...props}
                styleName="toggler-icon"
                className={classNames(
                    className,
                    'fa',
                    { 'fa-chevron-up': expanded },
                    { 'fa-chevron-down': !expanded }
                )}
            />
        );
    }
}

export default TogglerIcon;
