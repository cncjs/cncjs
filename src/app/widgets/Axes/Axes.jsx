import { Box } from '@tonic-ui/react';
import React from 'react';
import DisplayPanel from './DisplayPanel';
import Keypad from './Keypad';
import MDI from './MDI';

/**
 * @returns {JSX.Element}
 */
function Axes() {
  return (
    <Box>
      <DisplayPanel />
      <Keypad />
      <MDI />
    </Box>
  );
}

export default Axes;
