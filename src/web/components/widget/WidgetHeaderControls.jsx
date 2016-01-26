import _ from 'lodash';
import React from 'react';
import classNames from 'classnames';
import i18n from '../../lib/i18n';

class WidgetHeaderControls extends React.Component {
    state = {
        isCollapsed: false,
        isFullscreen: false
    };

    handleClick(btn) {
        if (btn === 'toggle') {
            let { isCollapsed } = this.state;
            this.props.handleClick(btn, !isCollapsed);
            this.setState({ isCollapsed: !isCollapsed });
            return;
        }

        if (btn === 'fullscreen') {
            let { isFullscreen } = this.state;
            this.props.handleClick(btn, !isFullscreen);
            this.setState({ isFullscreen: !isFullscreen });
            return;
        }

        this.props.handleClick(btn);
    }
    renderEditButton() {
        return (
            <a href="javascript:void(0)"
               key="edit"
               title={i18n._('Edit')}
               className="btn-icon btn-edit"
               onClick={() => this.handleClick('edit')}
            >
                <i className="fa fa-cog"></i>
            </a>
        );
    }
    renderRefreshButton() {
        return (
            <a href="javascript:void(0)"
               key="refresh"
               title={i18n._('Refresh')}
               className="btn-icon btn-refresh"
               onClick={() => this.handleClick('refresh')}
            >
                <i className="fa fa-refresh"></i>
            </a>
        );
    }
    renderToggleButton() {
        let { isCollapsed } = this.state;
        let classes = {
            icon: classNames(
                'fa',
                { 'fa-chevron-up': !isCollapsed },
                { 'fa-chevron-down': isCollapsed }
            )
        };

        return (
            <a href="javascript:void(0)"
               key="toggle"
               title={i18n._('Toggle Expand/Collapse')}
               className="btn-icon btn-toggle"
               onClick={() => this.handleClick('toggle')}
            >
                <i className={classes.icon}></i>
            </a>
        );
    }
    renderFullscreenButton() {
        let { isFullscreen } = this.state;
        let classes = {
            icon: classNames(
                'fa',
                { 'fa-expand': !isFullscreen },
                { 'fa-compress': isFullscreen }
            )
        };

        return (
            <a href="javascript:void(0)"
               key="fullscreen"
               title={i18n._('Toggle Fullscreen')}
               className="btn-icon btn-fullscreen"
               onClick={() => this.handleClick('fullscreen')}
            >
                <i className={classes.icon}></i>
            </a>
        );
    }
    renderDeleteButton() {
        return (
            <a href="javascript:void(0)"
               key="delete"
               title={i18n._('Delete')}
               className="btn-icon btn-delete"
               onClick={() => this.handleClick('delete')}
            >
                <i className="fa fa-times"></i>
            </a>
        );
    }
    render() {
        let buttons = _.map(this.props.buttons, (button) => {
            if (_.isObject(button)) {
                return button;
            }
            if (button === 'edit') {
                return this.renderEditButton();
            }
            if (button === 'refresh') {
                return this.renderRefreshButton();
            }
            if (button === 'toggle') {
                return this.renderToggleButton();
            }
            if (button === 'fullscreen') {
                return this.renderFullscreenButton();
            }
            if (button === 'delete') {
                return this.renderDeleteButton();
            }
        });

        return (
            <div className="widget-header-controls btn-group">{buttons}</div>
        );
    }
}

export default WidgetHeaderControls;
