import chainedFunction from 'chained-function';
import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import match from './match-component';
import DropdownMenu from './DropdownMenu';
import styles from './index.styl';

class MenuItem extends Component {
    static propTypes = {
        componentType: PropTypes.any,

        // A custom element for this component.
        componentClass: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.func
        ]),

        // Highlight the menu item as active.
        active: PropTypes.bool,

        // Disable the menu item, making it unselectable.
        disabled: PropTypes.bool,

        // Style the menu item as a horizontal rule, providing visual separation between groups of menu items.
        divider: PropTypes.bool,

        // Value passed to the `onSelect` handler, useful for identifying the selected menu item.
        eventKey: PropTypes.any,

        // Style the menu item as a header label, useful for describing a group of menu items.
        header: PropTypes.bool,

        // Callback fired when the menu item is clicked, even if it is disabled.
        onClick: PropTypes.func,

        // Dropdown
        open: PropTypes.bool,
        pullRight: PropTypes.bool,
        onClose: PropTypes.func,
        onSelect: PropTypes.func,
        rootCloseEvent: PropTypes.oneOf([
            'click',
            'mousedown'
        ])
    };

    static defaultProps = {
        componentClass: 'div',
        active: false,
        disabled: false,
        divider: false,
        header: false,

        // DropdownMenu
        open: false,
        pullRight: false
    };

    isMenuItem = match(MenuItem);

    handleClick = (event) => {
        const { disabled, onSelect, eventKey } = this.props;

        if (disabled) {
            event.preventDefault();
        }

        if (disabled) {
            return;
        }

        if (onSelect) {
            onSelect(eventKey, event);
        }
    };

    render() {
        const {
            componentType, // eslint-disable-line
            componentClass: Component,
            active,
            disabled,
            divider,
            eventKey, // eslint-disable-line
            header,
            onClick,

            // Dropdown
            open,
            pullRight,
            onClose,
            onSelect,
            rootCloseEvent,

            className,
            style,
            children,
            ...props
        } = this.props;

        if (divider) {
            // Forcibly blank out the children; separators shouldn't render any.
            props.children = undefined;

            return (
                <Component
                    {...props}
                    role="separator"
                    className={cx(className, styles.divider)}
                    style={style}
                >
                    {children}
                </Component>
            );
        }

        if (header) {
            return (
                <Component
                    {...props}
                    role="heading"
                    className={cx(className, styles.header)}
                    style={style}
                >
                    {children}
                </Component>
            );
        }

        const menuItems = React.Children.toArray(children)
            .filter(child => React.isValidElement(child) && this.isMenuItem(child));

        const others = React.Children.toArray(children)
            .filter(child => !(React.isValidElement(child) && this.isMenuItem(child)));

        return (
            <Component
                role="presentation"
                className={cx(className, styles.menuItemWrapper, {
                    [styles.active]: active,
                    [styles.disabled]: disabled,
                    [styles.dropdownSubmenu]: menuItems.length > 0,
                    [styles.open]: open
                })}
                style={style}
            >
                <div
                    {...props}
                    className={styles.menuItem}
                    disabled={disabled}
                    role="menuitem"
                    tabIndex="-1"
                    onClick={chainedFunction(
                        onClick,
                        this.handleClick
                    )}
                >
                    {others}
                </div>
                {(menuItems.length > 0) &&
                    <DropdownMenu
                        open={open}
                        pullRight={pullRight}
                        onClose={onClose}
                        onSelect={onSelect}
                        rootCloseEvent={rootCloseEvent}
                    >
                        {menuItems}
                    </DropdownMenu>
                }
            </Component>
        );
    }
}

// For component matching
MenuItem.defaultProps.componentType = MenuItem;

export default MenuItem;
