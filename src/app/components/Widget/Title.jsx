import { Box } from '@tonic-ui/react';
import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

/** @param {{ className?: string, children?: React.ReactNode, [key: string]: unknown }} props */
function Title({ className, ...props }) {
  return (
    <Box
      {...props}
      className={cx(className, styles.widgetTitle)}
    />
  );
}

export default Title;
