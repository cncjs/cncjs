/* eslint react/no-set-state: 0 */
import classNames from 'classnames';
import React from 'react';
import CSSModules from 'react-css-modules';
import styles from '../index.styl';

@CSSModules(styles)
class FullscreenButton extends React.Component {
    static propTypes = {
        children: React.PropTypes.node,
        defaultValue: React.PropTypes.bool,
        title: React.PropTypes.string,
        onClick: React.PropTypes.func.isRequired
    };
    static defaultProps = {
        defaultValue: false,
        onClick: () => {}
    };
    state = {
        isFullscreen: this.props.defaultValue
    };

    handleClick(event) {
        const { onClick } = this.props;
        const { isFullscreen } = this.state;
        event.preventDefault();
        onClick(event, !isFullscreen);
        this.setState({ isFullscreen: !isFullscreen });
    }
    render() {
        const { children, title, ...others } = this.props;
        const { isFullscreen } = this.state;
        const classes = {
            icon: classNames(
                'fa',
                { 'fa-expand': !isFullscreen },
                { 'fa-compress': isFullscreen }
            )
        };

        return (
            <a
                {...others}
                href="#"
                title={title}
                styleName="btn-icon"
                onClick={::this.handleClick}
            >
            {children ||
                <i className={classes.icon}></i>
            }
            </a>
        );
    }
}

export default FullscreenButton;
