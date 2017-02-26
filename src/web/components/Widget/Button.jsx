import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import Anchor from '../Anchor';
import styles from './index.styl';

class Button extends Component {
    static propTypes = {
        onClick: PropTypes.func
    };
    static defaultProps = {
        onClick: () => {}
    };

    render() {
        const { onClick, className, ...props } = this.props;

        return (
            <Anchor
                {...props}
                className={classNames(className, styles.btnIcon)}
                onClick={onClick}
            />
        );
    }
}

export default Button;
