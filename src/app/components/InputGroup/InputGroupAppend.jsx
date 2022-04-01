import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

function InputGroupAppend({
  tag: Component = 'div',
  className,
  ...props
}) {
  return (
    <Component
      {...props}
      className={cx(className, styles.inputGroupAppend)}
    />
  );
}

export default InputGroupAppend;
