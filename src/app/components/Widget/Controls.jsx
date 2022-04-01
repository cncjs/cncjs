import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

function Controls({ className, ...props }) {
  return (
    <div
      {...props}
      className={cx(className, styles.widgetControls)}
    />
  );
}

export default Controls;
