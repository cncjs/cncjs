import { Box } from '@tonic-ui/react';
import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

/** @param {{ className?: string, children?: React.ReactNode, [key: string]: unknown }} props */
function Controls({ className, ...props }) {
  return (
    <Box
      role="toolbar"
      aria-label="Widget controls"
      {...props}
      className={cx(className, styles.widgetControls)}
    />
  );
}

export default Controls;
