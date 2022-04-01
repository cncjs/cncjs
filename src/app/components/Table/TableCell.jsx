import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

function TableCell({ className, children, ...props }) {
  return (
    <div
      {...props}
      className={cx(className, styles.td)}
    >
      <div className={styles.tdContent}>
        {children}
      </div>
    </div>
  );
}

export default TableCell;
