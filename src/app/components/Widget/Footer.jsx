import { Box } from '@tonic-ui/react';
import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

function Footer({ className, ...props }) {
  return (
    <Box
      {...props}
      className={cx(className, styles.widgetFooter)}
    />
  );
}

export default Footer;
