import _ from 'lodash';
import i18n from 'i18next';
import React from 'react';
import joinClasses from 'react/lib/joinClasses';
import classNames from 'classnames';
import './widget.css';

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
        var style = {
            cursor: 'move'
        };
        return (
            <a href="javascript:void(0)"
               key='drag'
               title=""
               className="btn btn-link btn-drag"
               style={style}
               onClick={() => this.handleClick('drag')}>
            <i className="icon ion-ios-drag"></i>
            </a>
        );
    }
    renderRefreshButton() {
        return (
            <a href="javascript:void(0)"
               key='refresh'
               title=""
               className="btn btn-link btn-refresh"
               onClick={() => this.handleClick('refresh')}>
            <i className="icon ion-ios-refresh-empty"></i>
            </a>
        );
    }
    renderRemoveButton() {
        return (
            <a href="javascript:void(0)"
               key='remove'
               title={i18n._('Remove')}
               className="btn btn-link btn-remove"
               onClick={() => this.handleClick('remove')}>
                <i className="icon ion-ios-close-empty"></i>
            </a>
        );
    }
    renderToggleButton() {
        let iconClassNames = classNames(
            'icon',
            { 'ion-ios-arrow-up': ! this.state.isCollapsed },
            { 'ion-ios-arrow-down': this.state.isCollapsed }
        );
        return (
            <a href="javascript:void(0)"
               key='toggle'
               title={i18n._('Expand/Collapse')}
               className="btn btn-link btn-toggle"
               onClick={() => this.handleClick('toggle')}>
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

export class WidgetHeader extends React.Component {
    render() {
        let options = _.defaultsDeep({}, this.props, {
            type: 'default',
            title: '',
            toolbarButtons: []
        });
        let divClassNames = classNames(
            'widget-header',
            'clearfix',
            { 'widget-header-default': options.type === 'default' },
            { 'widget-header-inverse': options.type === 'inverse' }
        );
        return (
            <div className={divClassNames}>
                <h3 className="widget-header-title">{options.title}</h3>
                <WidgetHeaderToolbar buttons={options.toolbarButtons} handleClick={this.props.handleClick}/>
            </div>
        );
    }
}

export class WidgetContent extends React.Component {
    render() {
        let contentClass = classNames(
            'widget-content'
        );

        return (
            <div className={joinClasses(contentClass, this.props.className)}>
                {this.props.children}
            </div>
        );
    }
}

class WidgetFooter extends React.Component {
    render() {
        let options = _.defaultsDeep({}, this.props, {
            type: 'default'
        });
        let footerClass = classNames(
            'widget-footer',
            { 'widget-footer-default': options.type === 'default' },
            { 'widget-footer-inverse': options.type === 'inverse' }
        );

        return (
            <div className={footerClass}>
                {this.props.children}
            </div>
        );
    }
}

export default class Widget extends React.Component {
    static defaultProps = {
        options: {}
    };
    static propTypes = {
        options: React.PropTypes.object
    };

    render() {
        let options = this.props;
        let widgetClass = classNames(
            'widget',
            { 'widget-borderless': !!options.borderless }
        );
        let widgetStyle = {
            width: options.width ? options.width : null
        };
        let classes = classNames(
            'widget',
            { 'widget-borderless': !!options.borderless }
        );
        return (
            <div data-component="Widget">
                <div className={widgetClass} style={widgetStyle}>
                    {this.props.children}
                </div>
            </div>
        );
    }
}
