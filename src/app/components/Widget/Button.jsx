import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import styles from './index.styl';

class Button extends PureComponent {
  static propTypes = {
    inverted: PropTypes.bool,
    disabled: PropTypes.bool,
    onClick: PropTypes.func,
    title: PropTypes.string,
    'aria-label': PropTypes.string,
    'aria-pressed': PropTypes.bool,
    'aria-expanded': PropTypes.bool
  };

  static defaultProps = {
    inverted: false,
    disabled: false
  };

  render() {
    const { inverted, disabled, className, children, ...props } = this.props;

    return (
      <button
        type="button"
        {...props}
        disabled={disabled}
        className={classNames(className, styles.widgetButton, {
          [styles.disabled]: disabled,
          [styles.inverted]: inverted
        })}
      >
        {children}
      </button>
    );
  }
}

export default Button;
