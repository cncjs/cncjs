import React from 'react';
import { Box } from '@tonic-ui/react';

/**
 * @param {{value?: number | string}} props
 * @returns {JSX.Element}
 */
function PositionLabel({ value }) {
  const [integer, decimal] = String(value).split('.');

  return (
    <Box sx={{ fontSize: 24, padding: 5, textAlign: 'right' }}>
      <Box sx={{ display: 'inline' }}>{integer}</Box>
      <Box sx={{ display: 'inline' }}>.</Box>
      <Box sx={{ display: 'inline' }}>{decimal}</Box>
    </Box>
  );
}

export default PositionLabel;
