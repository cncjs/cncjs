import React from 'react';
import { Label, Line, Root, Unit, Value } from './styles';

/**
 * A named machine reading: what it is, what it says, and in what.
 *
 * The value is always monospace with tabular figures, so a column of readings
 * lines up and a changing one does not shuffle its own digits. `emphasis`
 * raises the figure for the one reading a screen is actually about.
 */
const Readout = ({ label, value, unit, emphasis }) => (
  <Root>
    <Label>{label}</Label>
    <Line>
      <Value emphasis={emphasis}>{value}</Value>
      {unit && <Unit>{unit}</Unit>}
    </Line>
  </Root>
);

export default Readout;
