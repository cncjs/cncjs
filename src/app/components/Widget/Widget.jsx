import { Box } from '@tonic-ui/react';
import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

/** @param {{ borderless?: boolean, fullscreen?: boolean, className?: string, children?: React.ReactNode, [key: string]: unknown }} props */
function Widget({ borderless = false, fullscreen = false, className, ...props }) {
  return (
    <Box
      role="region"
      {...props}
      className={cx(
        className,
        styles.widget,
        { [styles.widgetBorderless]: borderless },
        { [styles.widgetFullscreen]: fullscreen }
      )}
    />
  );
}

export default Widget;
