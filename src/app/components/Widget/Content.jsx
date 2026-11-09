import { Box } from '@tonic-ui/react';
import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

/** @param {{ className?: string, children?: React.ReactNode, [key: string]: unknown }} props */
function Content({ className, ...props }) {
  return (
    <Box
      {...props}
      className={cx(className, styles.widgetContent)}
    />
  );
}

export default Content;
