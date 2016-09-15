import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import Anchor from '../Anchor';
import styles from './index.styl';

@CSSModules(styles)
class Button extends Component {
    static propTypes = {
        onClick: PropTypes.func
    };
    static defaultProps = {
        onClick: () => {}
    };

    render() {
        const { onClick, ...props } = this.props;

        return (
            <Anchor
                {...props}
                styleName="btn-icon"
                onClick={onClick}
            />
        );
    }
}

export default Button;
