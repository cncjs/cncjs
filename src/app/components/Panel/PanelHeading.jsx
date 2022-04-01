import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

function PanelHeading({ className, ...props }) {
  return <div {...props} className={cx(className, styles.panelHeading)} />;
}

export default PanelHeading;
