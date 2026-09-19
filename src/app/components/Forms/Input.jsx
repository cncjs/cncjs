import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

class Input extends Component {
    static propTypes = {
      componentClass: PropTypes.oneOfType([
        PropTypes.func,
        PropTypes.string
      ]),
      innerRef: PropTypes.oneOfType([
        PropTypes.func,
        PropTypes.object,
        PropTypes.string
      ]),
      type: PropTypes.string
    };

    static defaultProps = {
      componentClass: 'input',
      type: 'text'
    };

    render() {
      const {
        componentClass: Component,
        innerRef,
        className,
        ...props
      } = this.props;

      return (
        <Component {...props} ref={innerRef} className={cx(className, 'form-control')} />
      );
    }
}

export default Input;
