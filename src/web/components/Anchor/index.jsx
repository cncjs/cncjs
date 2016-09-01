import React, { Component, PropTypes } from 'react';

const isTrivialHref = (href) => {
    return (
        !href ||
        href.trim() === '#'
    );
};

/**
 * There are situations due to browser quirks or bootstrap css where
 * an anchor tag is needed, when semantically a button tag is the
 * better choice. Anchor ensures that when an anchor is used like a
 * button its accessible. It also emulates input `disabled` behavior for
 * links, which is usually desirable for Buttons, NavItems, MenuItems, etc.
 */
class Anchor extends Component {
    static propTypes = {
        href: PropTypes.string,
        style: PropTypes.object,
        onClick: PropTypes.func,
        disabled: PropTypes.bool,
        role: PropTypes.string,
        tabIndex: PropTypes.oneOfType([
            PropTypes.number,
            PropTypes.string
        ]),
        componentClass: PropTypes.element
    };

    render() {
        let { href, role, tabIndex, disabled, style, ...props } = this.props;
        const Component = this.props.componentClass || 'a';

        if (isTrivialHref(href)) {
            role = role || 'button';
            // we want to make sure there is a href attribute on the node
            // otherwise, the cursor incorrectly styled (except with role='button')
            href = href || '';
        }

        if (disabled) {
            tabIndex = -1;
            style = { pointerEvents: 'none', ...style };
        }

        return (
            <Component
                {...props}
                role={role}
                href={href}
                style={style}
                tabIndex={tabIndex}
                onClick={::this.handleClick}
            />
        );
    }
    handleClick(event) {
        const { disabled, href, onClick } = this.props;

        if (disabled || isTrivialHref(href)) {
            event.preventDefault();
        }

        if (disabled) {
            event.stopPropagation();
            return;
        }

        if (onClick) {
            onClick(event);
        }
    }
}

export default Anchor;
