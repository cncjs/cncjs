import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

function Panel({ className, ...props }) {
  return <div {...props} className={cx(className, styles.panel, styles.panelDefault)} />;
}

export default Panel;
