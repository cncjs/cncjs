import chainedFunction from 'chained-function';
import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent, cloneElement } from 'react';
import warning from 'warning';
import DropdownMenu from './DropdownMenu';
import RootCloseWrapper from './RootCloseWrapper';
import match from './match-component';
import styles from './index.styl';

class DropdownMenuWrapper extends PureComponent {
    static propTypes = {
        componentType: PropTypes.any,

        // A custom element for this component.
        componentClass: PropTypes.oneOfType([
            PropTypes.func,
            PropTypes.string,
            PropTypes.shape({ $$typeof: PropTypes.symbol, render: PropTypes.func }),
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

    menu = null; // <DropdownMenu ref={c => this.menu = c} />

    isDropdownMenu = match(DropdownMenu);

    focusNext() {
        this.menu && this.menu.focusNext && this.menu.focusNext();
    }

    focusPrevious() {
        this.menu && this.menu.focusPrevious && this.menu.focusPrevious();
    }

    renderMenu(child, props) {
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
            ref
        });
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
            children,
            className,
            ...props
        } = this.props;

        return (
            <RootCloseWrapper
                disabled={!open}
                onRootClose={onClose}
                event={rootCloseEvent}
            >
                <Component
                    {...props}
                    className={cx(className, {
                        [styles.dropdownMenuWrapper]: true,
                        [styles.pullRight]: !!pullRight
                    })}
                >
                    {React.Children.map(children, child => {
                        if (!React.isValidElement(child)) {
                            return child;
                        }

                        if (this.isDropdownMenu(child)) {
                            return this.renderMenu(child, {
                                // Do not pass onClose and rootCloseEvent to the dropdown menu
                                open,
                                pullRight,
                                onSelect
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
DropdownMenuWrapper.defaultProps.componentType = DropdownMenuWrapper;

export default DropdownMenuWrapper;
