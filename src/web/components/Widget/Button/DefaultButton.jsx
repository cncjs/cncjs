import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import styles from '../index.styl';

@CSSModules(styles)
class DefaultButton extends Component {
    static propTypes = {
        title: PropTypes.string,
        onClick: PropTypes.func.isRequired
    };
    static defaultProps = {
        title: '',
        onClick: () => {}
    };

    handleClick(event) {
        const { onClick } = this.props;
        event.preventDefault();
        onClick(event);
    }
    render() {
        const { children, title, ...others } = this.props;

        return (
            <a
                {...others}
                href="#"
                title={title}
                styleName="btn-icon"
                onClick={::this.handleClick}
            >
                {children}
            </a>
        );
    }
}

export default DefaultButton;
