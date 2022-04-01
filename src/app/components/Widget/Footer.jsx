import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

function Footer({ className, ...props }) {
  return (
    <div
      {...props}
      className={cx(className, styles.widgetFooter)}
    />
  );
}

export default Footer;
