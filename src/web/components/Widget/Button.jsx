import classNames from 'classnames';
import React, { Component } from 'react';
import Anchor from '../Anchor';
import styles from './index.styl';

class Button extends Component {
    static propTypes = {
        ...Anchor.propTypes
    };
    static defaultProps = {
        ...Anchor.defaultProps
    };

    render() {
        const { className, ...props } = this.props;

        return (
            <Anchor
                {...props}
                className={classNames(
                    className,
                    styles.widgetButton,
                    { [styles.disabled]: !!props.disabled }
                )}
            />
        );
    }
}

export default Button;
