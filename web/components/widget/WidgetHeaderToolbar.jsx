import _ from 'lodash';
import React from 'react';
import classNames from 'classnames';
import i18n from '../../lib/i18n';

class WidgetHeaderToolbar extends React.Component {
    state = {
        isCollapsed: false
    };

    handleClick(btn) {
        if (btn === 'toggle') {
            this.props.handleClick(btn, ! this.state.isCollapsed);
            this.setState({isCollapsed: ! this.state.isCollapsed});
            return;
        }

        this.props.handleClick(btn);
    }
    renderDragButton() {
        let style = {
            cursor: 'move'
        };

        return (
            <a href="javascript:void(0)"
               key='drag'
               title=""
               className="btn btn-link btn-drag"
               style={style}
               onClick={() => this.handleClick('drag')}
            >
                <i className="glyphicon glyphicon-menu-hamburger"></i>
            </a>
        );
    }
    renderRefreshButton() {
        return (
            <a href="javascript:void(0)"
               key='refresh'
               title=""
               className="btn btn-link btn-refresh"
               onClick={() => this.handleClick('refresh')}
            >
                <i className="glyphicon glyphicon-refresh"></i>
            </a>
        );
    }
    renderRemoveButton() {
        return (
            <a href="javascript:void(0)"
               key='remove'
               title={i18n._('Remove')}
               className="btn btn-link btn-remove"
               onClick={() => this.handleClick('remove')}
            >
                <i className="glyphicon glyphicon-remove"></i>
            </a>
        );
    }
    renderToggleButton() {
        let iconClassNames = classNames(
            'glyphicon',
            { 'glyphicon-chevron-up': ! this.state.isCollapsed },
            { 'glyphicon-chevron-down': this.state.isCollapsed }
        );

        return (
            <a href="javascript:void(0)"
               key='toggle'
               title={i18n._('Expand/Collapse')}
               className="btn btn-link btn-toggle"
               onClick={() => this.handleClick('toggle')}
            >
                <i className={iconClassNames}></i>
            </a>
        );
    }
    render() {
        let that = this;
        let buttons = _.map(this.props.buttons, (button) => {
            if (_.isObject(button)) {
                return button;
            }
            if (button === 'refresh') {
                return that.renderRefreshButton();
            }
            if (button === 'remove') {
                return that.renderRemoveButton();
            }
            if (button === 'toggle') {
                return that.renderToggleButton();
            }
        })
        .concat(this.renderDragButton());

        return (
            <div className="widget-header-toolbar btn-group">{buttons}</div>
        );
    }
}

export default WidgetHeaderToolbar;
