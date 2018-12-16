import chainedFunction from 'chained-function';
import cx from 'classnames';
import activeElement from 'dom-helpers/activeElement';
import contains from 'dom-helpers/query/contains';
import PropTypes from 'prop-types';
import React, { PureComponent, cloneElement } from 'react';
import ReactDOM from 'react-dom';
import uncontrollable from 'uncontrollable';
import warning from 'warning';
import { ButtonGroup } from 'app/components/Buttons';
import DropdownToggle from './DropdownToggle';
import DropdownMenuWrapper from './DropdownMenuWrapper';
import DropdownMenu from './DropdownMenu';
import match from './match-component';
import styles from './index.styl';

class Dropdown extends PureComponent {
    static propTypes = {
        componentType: PropTypes.any,

        // A custom element for this component.
        componentClass: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.func
        ]),

        // The menu will open above the dropdown button, instead of below it.
        dropup: PropTypes.bool,

        // Whether or not component is disabled.
        disabled: PropTypes.bool,

        // Whether or not the dropdown is visible.
        open: PropTypes.bool,

        // Whether to open the dropdown on mouse over.
        autoOpen: PropTypes.bool,

        // Align the menu to the right side of the dropdown toggle.
        pullRight: PropTypes.bool,

        // A callback fired when the dropdown closes.
        onClose: PropTypes.func,

        // A callback fired when the dropdown wishes to change visibility. Called with the requested
        // `open` value.
        //
        // ```js
        // function(Boolean isOpen) {}
        // ```
        onToggle: PropTypes.func,

        // A callback fired when a menu item is selected.
        //
        // ```js
        // (eventKey: any, event: Object) => any
        // ```
        onSelect: PropTypes.func,

        // If `'menuitem'`, causes the dropdown to behave like a menu item rather than a menu button.
        role: PropTypes.string,

        // Which event when fired outside the component will cause it to be closed.
        rootCloseEvent: PropTypes.oneOf([
            'click',
            'mousedown'
        ]),

        onMouseEnter: PropTypes.func,
        onMouseLeave: PropTypes.func
    };

    static defaultProps = {
        componentClass: ButtonGroup,
        dropup: false,
        disabled: false,
        pullRight: false,
        open: false
    };

    menu = null; // <DropdownMenu ref={c => this.menu = c} />
    toggle = null; // <DropdownToggle ref={c => this.toggle = c} />
    _focusInDropdown = false;
    lastOpenEventType = null;

    isDropdownToggle = match(DropdownToggle);
    isDropdownMenu = match(DropdownMenu);
    isDropdownMenuWrapper = match(DropdownMenuWrapper);

    handleToggleClick = (event) => {
        if (this.props.disabled) {
            return;
        }

        this.toggleDropdown('click');
    };

    handleToggleKeyDown = (event) => {
        if (this.props.disabled) {
            return;
        }

        if (event.keyCode === 38) { // up
            if (!this.props.open) {
                this.toggleDropdown('keyup');
            } else if (this.menu.focusPrevious) {
                this.menu.focusPrevious();
            }
            event.preventDefault();
            return;
        }

        if (event.keyCode === 40) { // down
            if (!this.props.open) {
                this.toggleDropdown('keydown');
            } else if (this.menu.focusNext) {
                this.menu.focusNext();
            }
            event.preventDefault();
            return;
        }

        if (event.keyCode === 27 || event.keyCode === 9) { // esc or tab
            this.closeDropdown();
            return;
        }
    };

    handleMouseEnter = (event) => {
        const { autoOpen, onToggle } = this.props;

        if (autoOpen && typeof onToggle === 'function') {
            onToggle(true);
        }
    };

    handleMouseLeave = (event) => {
        const { autoOpen, onToggle } = this.props;

        if (autoOpen && typeof onToggle === 'function') {
            onToggle(false);
        }
    };

    closeDropdown = () => {
        const { open, autoOpen, onToggle } = this.props;

        if (open) {
            this.toggleDropdown(null);
            return;
        }

        if (autoOpen && typeof onToggle === 'function') {
            onToggle(false);
        }
    };

    componentDidMount() {
        this.focusOnOpen();
    }
    componentWillUpdate(nextProps) {
        if (!nextProps.open && this.props.open) {
            this._focusInDropdown = this.menu && contains(ReactDOM.findDOMNode(this.menu), activeElement(document));
        }
    }
    componentDidUpdate(prevProps) {
        const { open } = this.props;
        const prevOpen = prevProps.open;

        if (open && !prevOpen) {
            this.focusOnOpen();
        }

        if (!open && prevOpen) {
            // if focus hasn't already moved from the menu lets return it to the toggle
            if (this._focusInDropdown) {
                this._focusInDropdown = false;
                this.focus();
            }
        }
    }
    toggleDropdown(eventType) {
        const { open, onToggle } = this.props;
        const shouldOpen = !open;

        if (shouldOpen) {
            this.lastOpenEventType = eventType;
        }

        if (typeof onToggle === 'function') {
            onToggle(shouldOpen);
        }
    }
    focusOnOpen() {
        const menu = this.menu;

        if (this.lastOpenEventType === 'keydown' || this.props.role === 'menuitem') {
            menu.focusNext && menu.focusNext();
            return;
        }

        if (this.lastOpenEventType === 'keyup') {
            menu.focusPrevious && menu.focusPrevious();
            return;
        }
    }
    focus() {
        const toggle = ReactDOM.findDOMNode(this.toggle);

        if (toggle && toggle.focus) {
            toggle.focus();
        }
    }
    renderToggle(child, props) {
        let ref = c => {
            this.toggle = c;
        };

        if (typeof child.ref === 'string') {
            warning(
                false,
                'String refs are not supported on `<Dropdown.Toggle>` components. ' +
                'To apply a ref to the component use the callback signature:\n\n ' +
                'https://facebook.github.io/react/docs/more-about-refs.html#the-ref-callback-attribute'
            );
        } else {
            ref = chainedFunction(child.ref, ref);
        }

        return cloneElement(child, {
            ...props,
            ref,
            onClick: chainedFunction(
                child.props.onClick,
                this.handleToggleClick
            ),
            onKeyDown: chainedFunction(
                child.props.onKeyDown,
                this.handleToggleKeyDown
            )
        });
    }
    renderMenu(child, { id, onClose, onSelect, rootCloseEvent, ...props }) {
        let ref = c => {
            this.menu = c;
        };

        if (typeof child.ref === 'string') {
            warning(
                false,
                'String refs are not supported on `<Dropdown.Menu>` components. ' +
                'To apply a ref to the component use the callback signature:\n\n ' +
                'https://facebook.github.io/react/docs/more-about-refs.html#the-ref-callback-attribute'
            );
        } else {
            ref = chainedFunction(child.ref, ref);
        }

        return cloneElement(child, {
            ...props,
            ref,
            onClose: chainedFunction(
                child.props.onClose,
                onClose,
                this.closeDropdown
            ),
            onSelect: chainedFunction(
                child.props.onSelect,
                onSelect,
                this.closeDropdown
            ),
            rootCloseEvent
        });
    }
    render() {
        const {
            componentType, // eslint-disable-line
            componentClass: Component,
            dropup,
            disabled,
            pullRight,
            open,
            autoOpen, // eslint-disable-line
            onClose,
            onSelect,
            className,
            rootCloseEvent,
            onMouseEnter,
            onMouseLeave,
            onToggle, // eslint-disable-line
            children,
            ...props
        } = this.props;

        if (Component === ButtonGroup) {
            props.dropdownOpen = open;
        }

        return (
            <Component
                {...props}
                onMouseEnter={chainedFunction(
                    onMouseEnter,
                    this.handleMouseEnter
                )}
                onMouseLeave={chainedFunction(
                    onMouseLeave,
                    this.handleMouseLeave
                )}
                className={cx(className, styles.dropdown, {
                    [styles.open]: open,
                    [styles.disabled]: disabled,
                    [styles.dropup]: dropup
                })}
            >
                {React.Children.map(children, child => {
                    if (!React.isValidElement(child)) {
                        return child;
                    }

                    if (this.isDropdownToggle(child)) {
                        return this.renderToggle(child, {
                            disabled, open
                        });
                    }

                    if (this.isDropdownMenu(child) || this.isDropdownMenuWrapper(child)) {
                        return this.renderMenu(child, {
                            open,
                            pullRight,
                            onClose,
                            onSelect,
                            rootCloseEvent
                        });
                    }

                    return child;
                })}
            </Component>
        );
    }
}

// For component matching
Dropdown.defaultProps.componentType = Dropdown;

const UncontrollableDropdown = uncontrollable(Dropdown, {
    // Define the pairs of prop/handlers you want to be uncontrollable
    open: 'onToggle'
});

UncontrollableDropdown.Toggle = DropdownToggle;
UncontrollableDropdown.Menu = DropdownMenu;
UncontrollableDropdown.MenuWrapper = DropdownMenuWrapper;

export default UncontrollableDropdown;
