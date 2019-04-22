import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';

const isTrivialHref = (href) => {
    return (!href || href.trim() === '#');
};

class Anchor extends PureComponent {
    static propTypes = {
        componentClass: PropTypes.oneOfType([
            PropTypes.func,
            PropTypes.string,
            PropTypes.shape({ $$typeof: PropTypes.symbol, render: PropTypes.func }),
        ]),
        disabled: PropTypes.bool,
        href: PropTypes.string,
        onClick: PropTypes.func,
        role: PropTypes.string,
        style: PropTypes.object,
        tabIndex: PropTypes.oneOfType([
            PropTypes.number,
            PropTypes.string
        ])
    };

    static defaultProps = {
        componentClass: 'a'
    };

    actions = {
        handleClick: (event) => {
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
    };

    render() {
        let {
            href,
            role,
            tabIndex,
            componentClass,
            style,
            ...props
        } = this.props;
        const Component = componentClass || 'a';

        if (isTrivialHref(href)) {
            role = role || 'button';
            href = href || '';
        }

        if (this.props.disabled) {
            tabIndex = -1;
            style = {
                pointerEvents: 'none',
                ...style
            };
        }

        return (
            <Component
                {...props}
                role={role}
                href={href}
                style={style}
                tabIndex={tabIndex}
                onClick={this.actions.handleClick}
            />
        );
    }
}

export default Anchor;
