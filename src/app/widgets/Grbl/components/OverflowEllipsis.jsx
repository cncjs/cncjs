import { Box } from '@tonic-ui/react';
import React from 'react';

/**
 * @param {{ children?: React.ReactNode, title?: string }} props
 */
function OverflowEllipsis(props) {
  return <Box {...props} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} />;
}

export default OverflowEllipsis;
