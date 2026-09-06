import { Box } from '@tonic-ui/react';
import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

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
