import { Box, Link } from '@tonic-ui/react';
import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

/** @param {{ className?: string, children?: React.ReactNode, [key: string]: unknown }} props */
function Sortable(props) {
  const { children, className, style, ...rest } = props;

  return (
    <Box className={cx(className, styles.widgetSortable)} style={style}>
      <Link {...rest}>
        {children}
      </Link>
    </Box>
  );
}

export default Sortable;
