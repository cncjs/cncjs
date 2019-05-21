import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Button } from 'app/components/Buttons';
import styles from './index.styl';

class DropdownToggle extends PureComponent {
    static propTypes = {
        componentType: PropTypes.any,

        // A custom element for this component.
        componentClass: PropTypes.oneOfType([
            PropTypes.func,
            PropTypes.string,
            PropTypes.shape({ $$typeof: PropTypes.symbol, render: PropTypes.func }),
        ]),

        // One of: 'lg', 'md', 'sm', 'xs'
        btnSize: Button.propTypes.btnSize,

        // One of: 'default', 'primary', 'secondary', 'danger', 'warning', 'info', 'success', 'light', 'dark', 'link'
        btnStyle: Button.propTypes.btnStyle,

        // Whether to prevent a caret from being rendered next to the title.
        noCaret: PropTypes.bool,

        // Title content.
        title: PropTypes.string,

        // Dropdown
        disabled: PropTypes.bool,
        open: PropTypes.bool
    };

    static defaultProps = {
        componentClass: Button,
        noCaret: false,

        // Dropdown
        disabled: false,
        open: false
    };

    render() {
        const {
            componentType, // eslint-disable-line
            componentClass: Component,
            noCaret,
            open,
            className,
            children,
            ...props
        } = this.props;

        if (Component === Button) {
            props.btnStyle = props.btnStyle || 'default';
            props.btnSize = props.btnSize || Button.defaultProps.btnSize;
            props.dropdownToggle = true;
        }

        const useCaret = !noCaret;
        const empty = !children && !props.title;

        return (
            <Component
                {...props}
                aria-haspopup
                aria-expanded={open}
                role="button"
                className={cx(className, {
                    [styles.dropdownToggle]: true,
                    [styles.btnLink]: props.btnStyle === 'link', // CSS selector ".btn-link:hover .caret"
                    [styles.btnLg]: props.btnSize === 'lg' || props.btnSize === 'large',
                    [styles.btnMd]: props.btnSize === 'md' || props.btnSize === 'medium',
                    [styles.btnSm]: props.btnSize === 'sm' || props.btnSize === 'small',
                    [styles.btnXs]: props.btnSize === 'xs' || props.btnSize === 'extra-small',
                    [styles.empty]: empty
                })}
            >
                {children || props.title}
                {useCaret && <span className={styles.caret} />}
            </Component>
        );
    }
}

// For component matching
DropdownToggle.defaultProps.componentType = DropdownToggle;

export default DropdownToggle;
