import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

function Title({ className, ...props }) {
  return (
    <div
      {...props}
      className={cx(className, styles.widgetTitle)}
    />
  );
}

export default Title;
