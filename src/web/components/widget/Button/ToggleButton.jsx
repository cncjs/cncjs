import classNames from 'classnames';
import React from 'react';
import i18n from '../../../lib/i18n';

class ToggleButton extends React.Component {
    static propTypes = {
        children: React.PropTypes.node,
        defaultValue: React.PropTypes.bool,
        title: React.PropTypes.string,
        onClick: React.PropTypes.func.isRequired
    };
    static defaultProps = {
        title: i18n._('Expand/Collapse'),
        defaultValue: false
    };
    state = {
        isCollapsed: this.props.defaultValue
    };

    handleClick(event) {
        event.preventDefault();

        const { isCollapsed } = this.state;
        this.props.onClick(event, !isCollapsed);
        this.setState({ isCollapsed: !isCollapsed });
    }
    render() {
        const { children, title, ...others } = this.props;
        const { isCollapsed } = this.state;
        const classes = {
            icon: classNames(
                'fa',
                { 'fa-chevron-up': !isCollapsed },
                { 'fa-chevron-down': isCollapsed }
            )
        };

        return (
            <a
                {...others}
                href="#"
                title={title}
                className="btn-icon btn-toggle"
                onClick={::this.handleClick}
            >
            {children ||
                <i className={classes.icon}></i>
            }
            </a>
        );
    }
}

export default ToggleButton;
