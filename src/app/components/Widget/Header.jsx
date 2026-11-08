import { Box, useColorMode } from '@tonic-ui/react';
import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

/** @param {{ fixed?: boolean, className?: string, children?: React.ReactNode, [key: string]: unknown }} props */
function Header({ fixed = false, className, ...props }) {
  const [colorMode] = useColorMode();

  return (
    <Box
      {...props}
      backgroundColor={colorMode === 'dark' ? 'background.highest' : 'background.high'}
      border="1px solid"
      borderColor="border.secondary"
      color="text.primary"
      className={cx(
        className,
        styles.widgetHeader,
        { [styles.widgetHeaderFixed]: fixed }
      )}
    />
  );
}

export default Header;
