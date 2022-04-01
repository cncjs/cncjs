import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

function InputGroupText({
  tag: Component = 'div',
  className,
  ...props
}) {
  return (
    <Component
      {...props}
      className={cx(className, styles.inputGroupText)}
    />
  );
}

export default InputGroupText;
