import React from 'react';
import { Box } from '@tonic-ui/react';

/**
 * @param {{numerator?: number, denominator?: number}} props
 * @returns {JSX.Element}
 */
function Fraction({ numerator, denominator }) {
  return (
    <Box
      aria-label={`${numerator}/${denominator}`}
      sx={{
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        flexDirection: 'column',
        verticalAlign: '-0.5em',
        fontSize: '85%',
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          display: 'block',
          lineHeight: '1em',
          margin: '0 0.1em',
        }}
      >
        {numerator}
      </Box>
      <Box
        sx={{
          borderTop: '1px solid',
          display: 'block',
          lineHeight: '1em',
          margin: '0 0.1em',
          minWidth: 16,
        }}
      >
        {denominator}
      </Box>
    </Box>
  );
}

export default Fraction;
