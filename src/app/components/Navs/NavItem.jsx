import chainedFunction from 'chained-function';
import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Anchor from 'app/components/Anchor';
import styles from './index.styl';

class NavItem extends PureComponent {
    static propTypes = {
        /** Highlight the nav item as active. */
        active: PropTypes.bool,

        /** Whether or not component is disabled. */
        disabled: PropTypes.bool,

        /** Value passed to the `onSelect` handler, useful for identifying the selected nav item. */
        eventKey: PropTypes.any,

        /** HTML `href` attribute corresponding to `a.href`. */
        href: PropTypes.string,

        /** Callback fired when the nav item is clicked. */
        onClick: PropTypes.func,

        /** Callback fired when the nav item is selected. */
        onSelect: PropTypes.func,

        /** ARIA role for the NavItem. */
        role: PropTypes.string
    };
    static defaultProps = {
        active: false,
        disabled: false
    };

    actions = {
        handleClick: (event) => {
            if (this.props.onSelect) {
                event.preventDefault();

                if (!this.props.disabled) {
                    this.props.onSelect(this.props.eventKey, event);
                }
            }
        }
    };

    render() {
        const { active, disabled, onClick, className, style, ...props } = this.props;

        delete props.onSelect;
        delete props.eventKey;

        // Injected down by <Nav>
        delete props.activeKey;
        delete props.activeHref;

        if (props.role === 'tab') {
            props['aria-selected'] = active;
        }

        return (
            <li
                role="presentation"
                className={cx(
                    className,
                    { [styles.active]: active },
                    { [styles.disabled]: disabled }
                )}
                style={style}
            >
                <Anchor
                    {...props}
                    disabled={disabled}
                    onClick={chainedFunction(onClick, this.actions.handleClick)}
                />
            </li>
        );
    }
}

export default NavItem;
