import classNames from 'classnames';
import React from 'react';
import styles from './index.styl';

const PanelBody = ({ className, ...props }) => (
  <div {...props} className={classNames(className, styles.panelBody)} />
);

export default PanelBody;
