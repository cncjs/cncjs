import chainedFunction from 'chained-function';
import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent, cloneElement } from 'react';
import ReactDOM from 'react-dom';
import MenuItem from './MenuItem';
import RootCloseWrapper from './RootCloseWrapper';
import match from './match-component';
import styles from './index.styl';

class DropdownMenu extends PureComponent {
    static propTypes = {
        componentType: PropTypes.any,

        // A custom element for this component.
        componentClass: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.func
        ]),

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
        componentClass: 'div'
    };

    isMenuItem = match(MenuItem);

    handleKeyDown = (event) => {
        if (event.keyCode === 40) { // Down
            this.focusNext();
            event.preventDefault();
            return;
        }

        if (event.keyCode === 38) { // up
            this.focusPrevious();
            event.preventDefault();
            return;
        }

        if (event.keyCode === 27 || event.keyCode === 9) { // esc or tab
            this.props.onClose(event);
            return;
        }
    };

    getItemsAndActiveIndex() {
        const items = this.getFocusableMenuItems();
        const activeIndex = items.indexOf(document.activeElement);

        return { items, activeIndex };
    }
    getFocusableMenuItems() {
        const node = ReactDOM.findDOMNode(this);
        if (!node) {
            return [];
        }

        return Array.from(node.querySelectorAll('[tabIndex="-1"]:not([disabled])'));
    }
    focusNext() {
        const { items, activeIndex } = this.getItemsAndActiveIndex();
        if (items.length === 0) {
            return;
        }

        const nextIndex = (activeIndex >= items.length - 1) ? 0 : activeIndex + 1;
        items[nextIndex].focus();
    }
    focusPrevious() {
        const { items, activeIndex } = this.getItemsAndActiveIndex();
        if (items.length === 0) {
            return;
        }

        const prevIndex = (activeIndex <= 0) ? items.length - 1 : activeIndex - 1;
        items[prevIndex].focus();
    }
    render() {
        const {
            componentType, // eslint-disable-line
            componentClass: Component,
            open,
            pullRight,
            onClose,
            onSelect,
            rootCloseEvent,
            className,
            style = {},
            children,
            ...props
        } = this.props;

        const activeMenuItems = React.Children.toArray(children)
            .filter(child => React.isValidElement(child) && this.isMenuItem(child) && child.props.active);

        return (
            <RootCloseWrapper
                disabled={!open}
                onRootClose={onClose}
                event={rootCloseEvent}
            >
                <Component
                    {...props}
                    role="menu"
                    className={cx(className, {
                        [styles.dropdownMenu]: true,
                        [styles.selected]: activeMenuItems.length > 0,
                        [styles.pullRight]: !!pullRight
                    })}
                    style={style}
                >
                    {React.Children.map(children, child => {
                        if (React.isValidElement(child) && this.isMenuItem(child)) {
                            return cloneElement(child, {
                                onKeyDown: chainedFunction(
                                    child.props.onKeyDown,
                                    this.handleKeyDown
                                ),
                                onSelect: chainedFunction(
                                    child.props.onSelect,
                                    onSelect
                                )
                            });
                        }

                        return child;
                    })}
                </Component>
            </RootCloseWrapper>
        );
    }
}

// For component matching
DropdownMenu.defaultProps.componentType = DropdownMenu;

export default DropdownMenu;
