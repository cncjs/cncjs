import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Anchor from 'app/components/Anchor';
import styles from './index.styl';

class ToggleSwitch extends PureComponent {
    static propTypes = {
        checked: PropTypes.bool,
        disabled: PropTypes.bool,
        onChange: PropTypes.func,
        size: PropTypes.oneOf([
            'lg',
            'large',
            'sm',
            'small'
        ])
    };
    static defaultProps = {
        checked: false,
        disabled: false,
        size: 'lg'
    };

    state = {
        checked: this.props.checked
    };
    actions = {
        handleChange: (event) => {
            event.preventDefault();

            if (this.props.disabled) {
                return;
            }

            if (typeof this.props.onChange === 'function') {
                this.props.onChange(event);
                return;
            }

            this.setState({ checked: !this.state.checked });
        }
    };

    componentWillReceiveProps(nextProps) {
        if (this.props.checked !== nextProps.checked) {
            this.setState({ checked: nextProps.checked });
        }
    }
    get checked() {
        return this.state.checked;
    }
    render() {
        const {
            className,
            disabled,
            size,
            ...props
        } = this.props;

        delete props.checked;
        delete props.onChange;

        return (
            <Anchor
                {...props}
                className={cx(
                    className,
                    styles.switch,
                    { [styles.switchSm]: size === 'sm' || size === 'small' },
                    { [styles.checked]: this.state.checked }
                )}
                onClick={this.actions.handleChange}
            >
                <div
                    className={cx(
                        styles.toggle,
                        { [styles.toggleSm]: size === 'sm' || size === 'small' },
                        styles.round,
                        { [styles.disabled]: disabled }
                    )}
                />
            </Anchor>
        );
    }
}

export default ToggleSwitch;
