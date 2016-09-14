import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import styles from '../index.styl';

@CSSModules(styles)
class EditButton extends Component {
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
            {children ||
                <i className="fa fa-cog"></i>
            }
            </a>
        );
    }
}

export default EditButton;
