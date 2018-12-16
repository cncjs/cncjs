import cx from 'classnames';
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import styles from './index.styl';

const noop = () => {};

class RadioButton extends PureComponent {
    static propTypes = {
        /** Label for the radio button. */
        label: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.node
        ]),
        /** Customized class name for the radio button. */
        inputClassName: PropTypes.object,
        /** Customized style for the radio button. */
        inputStyle: PropTypes.object,
        /** If true, the radio button will be shown as disabled and cannot be modified. */
        disabled: PropTypes.bool,
        /** Get the checked state. */
        checked: PropTypes.bool,
        /** The default checked state of the radio button. */
        defaultChecked: PropTypes.bool,
        /** Callback function that will be invoked when the value changes. */
        onChange: PropTypes.func
    };

    static defaultProps = {
        disabled: false
    };

    radioButton = null;

    get checked() {
        if (!this.radioButton) {
            return null;
        }
        return this.radioButton.checked;
    }

    render() {
        const {
            label,
            inputClassName,
            inputStyle,
            disabled,
            onChange = noop,

            // Default props
            className,
            style,
            children,
            ...props
        } = this.props;

        return (
            <label
                className={cx(
                    className,
                    styles.controlRadio,
                    { [styles.disabled]: disabled }
                )}
                style={style}
            >
                <input
                    {...props}
                    ref={node => {
                        this.radioButton = node;
                    }}
                    type="radio"
                    disabled={disabled}
                    className={cx(
                        inputClassName,
                        styles.inputRadio
                    )}
                    style={inputStyle}
                    onChange={onChange}
                />
                <i className={styles.controlIndicator} />
                {label ? <span className={styles.textLabel}>{label}</span> : null}
                {children}
            </label>
        );
    }
}

export default RadioButton;
