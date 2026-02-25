import classNames from 'classnames';
import React from 'react';
import styles from './index.styl';

const Controls = ({ className, ...props }) => (
  <div
    role="toolbar"
    aria-label="Widget controls"
    {...props}
    className={classNames(className, styles.widgetControls)}
  />
);

export default Controls;
