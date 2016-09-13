import classNames from 'classnames';
import React from 'react';
import i18n from '../../../lib/i18n';

class FullscreenButton extends React.Component {
    static propTypes = {
        children: React.PropTypes.node,
        defaultValue: React.PropTypes.bool,
        title: React.PropTypes.string,
        onClick: React.PropTypes.func.isRequired
    };
    static defaultProps = {
        title: i18n._('Fullscreen'),
        defaultValue: false
    };
    state = {
        isFullscreen: this.props.defaultValue
    };

    handleClick(event) {
        event.preventDefault();

        const { isFullscreen } = this.state;
        this.props.onClick(event, !isFullscreen);
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
                className="btn-icon btn-fullscreen"
                onClick={::this.handleClick}
            >
            {children ||
                <i className={classes.icon} />
            }
            </a>
        );
    }

}

export default FullscreenButton;
