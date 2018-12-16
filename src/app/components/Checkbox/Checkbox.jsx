import cx from 'classnames';
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import chainedFunction from 'chained-function';
import styles from './index.styl';

const noop = () => {};

class Checkbox extends PureComponent {
    static propTypes = {
        /** Text label to attach next to the checkbox element. */
        label: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.node
        ]),
        /** Customized class name for the checkbox element. */
        inputClassName: PropTypes.object,
        /** Customized style for the checkbox element. */
        inputStyle: PropTypes.object,
        /** If true, the checkbox shown as disabled and cannot be modified. */
        disabled: PropTypes.bool,
        /** The checked state of the checkbox element. */
        checked: PropTypes.bool,
        /** The default checked state of the checkbox element. */
        defaultChecked: PropTypes.bool,
        /** The indeterminate state of the checkbox element. */
        indeterminate: PropTypes.bool,
        /** The default indeterminate state of the checkbox element. */
        defaultIndeterminate: PropTypes.bool,
        /** The callback function that is triggered when the state changes. */
        onChange: PropTypes.func,
        /** The callback function that is triggered when the checkbox is clicked. */
        onClick: PropTypes.func
    };

    static defaultProps = {
        disabled: false,
        defaultIndeterminate: false
    };

    checkbox = null;

    updateIndeterminateState = () => {
        if (typeof (this.props.indeterminate) !== 'undefined') {
            this.checkbox.indeterminate = !!this.props.indeterminate;
        }
    };

    get checked() {
        if (!this.checkbox) {
            return null;
        }
        return this.checkbox.checked;
    }

    get indeterminate() {
        if (!this.checkbox) {
            return null;
        }
        return this.checkbox.indeterminate;
    }

    render() {
        const {
            label,
            inputClassName,
            inputStyle,
            disabled,
            defaultIndeterminate,
            onChange = noop,
            onClick = noop,

            // Default props
            className,
            style,
            children,
            ...props
        } = this.props;

        delete props.indeterminate;

        return (
            <label
                className={cx(
                    className,
                    styles.controlCheckbox,
                    { [styles.disabled]: disabled }
                )}
                style={style}
            >
                <input
                    {...props}
                    ref={node => {
                        this.checkbox = node;
                        const indeterminate = (typeof (this.props.indeterminate) !== 'undefined') ? this.props.indeterminate : defaultIndeterminate;
                        node && (this.checkbox.indeterminate = indeterminate);
                    }}
                    type="checkbox"
                    disabled={disabled}
                    className={cx(
                        inputClassName,
                        styles.inputCheckbox
                    )}
                    style={inputStyle}
                    onChange={onChange}
                    onClick={chainedFunction(
                        this.updateIndeterminateState,
                        onClick
                    )}
                />
                <i className={styles.controlIndicator} />
                {label ? <span className={styles.textLabel}>{label}</span> : null}
                {children}
            </label>
        );
    }
}

export default Checkbox;
