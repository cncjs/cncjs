import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

function PanelBody({ className, ...props }) {
  return <div {...props} className={cx(className, styles.panelBody)} />;
}

export default PanelBody;
