import { Box } from '@tonic-ui/react';
import React from 'react';
import OverflowEllipsis from './OverflowEllipsis';
import Readout from './Readout';

/**
 * @param {{ children?: React.ReactNode, label: string }} props
 */
function ReportRow({ children, label }) {
  return (
    <Box alignItems="center" display="flex" mb="2x">
      <Box width="50%"><OverflowEllipsis title={label}>{label}</OverflowEllipsis></Box>
      <Box width="50%"><Readout>{children}</Readout></Box>
    </Box>
  );
}

export default ReportRow;
