import { Box } from '@tonic-ui/react';
import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

function Content({ className, ...props }) {
  return (
    <Box
      {...props}
      className={cx(className, styles.widgetContent)}
    />
  );
}

export default Content;
