import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

function Content({ className, ...props }) {
  return (
    <div
      {...props}
      className={cx(className, styles.widgetContent)}
    />
  );
}

export default Content;
