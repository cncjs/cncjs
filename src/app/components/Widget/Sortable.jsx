import { Box } from '@tonic-ui/react';
import cx from 'classnames';
import React from 'react';
import Anchor from '../Anchor';
import styles from './index.styl';

function Sortable(props) {
  const { children, className, style, ...rest } = props;

  return (
    <Box className={cx(className, styles.widgetSortable)} style={style}>
      <Anchor {...rest}>
        {children}
      </Anchor>
    </Box>
  );
}

export default Sortable;
