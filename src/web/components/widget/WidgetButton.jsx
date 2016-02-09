import _ from 'lodash';
import React from 'react';
import classNames from 'classnames';
import i18n from '../../lib/i18n';

export class DefaultButton extends React.Component {
    static propTypes = {
        title: React.PropTypes.string,
        onClick: React.PropTypes.func.isRequired
    };

    handleClick(event) {
        this.props.onClick(event);
    }
    render() {
        const { title, children, ...props } = this.props;

        return (
            <a
                {...props}
                href="javascript:void(0)"
                title={title}
                className="btn-icon"
                onClick={::this.handleClick}
            >
                {children}
            </a>
        );
    }
}

export class EditButton extends React.Component {
    static propTypes = {
        title: React.PropTypes.string,
        onClick: React.PropTypes.func.isRequired
    };
    static defaultProps = {
        title: i18n._('Edit')
    };

    handleClick(event) {
        this.props.onClick(event);
    }
    render() {
        const { title, children, ...props } = this.props;

        return (
            <a
                {...props}
                href="javascript:void(0)"
                title={title}
                className="btn-icon btn-edit"
                onClick={::this.handleClick}
            >
                {children ||
                <i className="fa fa-cog"></i>
                }
            </a>
        );
    }
}

export class RefreshButton extends React.Component {
    static propTypes = {
        onClick: React.PropTypes.func.isRequired
    };
    static defaultProps = {
        title: i18n._('Refresh')
    };

    handleClick(event) {
        this.props.onClick(event);
    }
    render() {
        const { title, children, ...props } = this.props;

        return (
            <a
                {...props}
                href="javascript:void(0)"
                title={title}
                className="btn-icon btn-refresh"
                onClick={::this.handleClick}
            >
                {children ||
                <i className="fa fa-refresh"></i>
                }
            </a>
        );
    }
}

export class ToggleButton extends React.Component {
    static propTypes = {
        defaultValue: React.PropTypes.bool,
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
        const { isCollapsed } = this.state;
        this.props.onClick(event, !isCollapsed);
        this.setState({ isCollapsed: !isCollapsed });
    }
    render() {
        const { title, children, ...props } = this.props;
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
                {...props}
                href="javascript:void(0)"
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

export class FullscreenButton extends React.Component {
    static propTypes = {
        defaultValue: React.PropTypes.bool,
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
        const { isFullscreen } = this.state;
        this.props.onClick(event, !isFullscreen);
        this.setState({ isFullscreen: !isFullscreen });
    }
    render() {
        const { title, children, ...props } = this.props;
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
                {...props}
                href="javascript:void(0)"
                title={title}
                className="btn-icon btn-fullscreen"
                onClick={::this.handleClick}
            >
                {children ||
                <i className={classes.icon}></i>
                }
            </a>
        );
    }

}

export class DeleteButton extends React.Component {
    static propTypes = {
        onClick: React.PropTypes.func.isRequired
    };
    static defaultProps = {
        title: i18n._('Delete')
    };

    handleClick(event) {
        this.props.onClick(event);
    }
    render() {
        const { title, children, ...props } = this.props;

        return (
            <a href="javascript:void(0)"
               title={title}
               className="btn-icon btn-delete"
               onClick={::this.handleClick}
            >
                {children ||
                <i className="fa fa-times"></i>
                }
            </a>
        );
    }
}

class WidgetButton extends React.Component {
    static propTypes = {
        type: React.PropTypes.string
    };
    static defaultProps = {
        type: 'default'
    };

    render() {
        const { type, children, ...props } = this.props;

        if (type === 'edit') {
            return <EditButton {...props}>{children}</EditButton>;
        }
        if (type === 'refresh') {
            return <RefreshButton {...props}>{children}</RefreshButton>;
        }
        if (type === 'toggle') {
            return <ToggleButton {...props}>{children}</ToggleButton>;
        }
        if (type === 'fullscreen') {
            return <FullscreenButton {...props}>{children}</FullscreenButton>;
        }
        if (type === 'delete') {
            return <DeleteButton {...props}>{children}</DeleteButton>;
        }

        return <DefaultButton {...props}>{children}</DefaultButton>;
    }
}

export default WidgetButton;
