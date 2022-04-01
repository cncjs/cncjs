import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

function InputGroupPrepend({
  tag: Component = 'div',
  className,
  ...props
}) {
  return (
    <Component
      {...props}
      className={cx(className, styles.inputGroupPrepend)}
    />
  );
}

export default InputGroupPrepend;
