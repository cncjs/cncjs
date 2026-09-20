import React from 'react';
import { Label, Line, Root, Unit, Value } from './styles';

/**
 * A machine reading: what it says, and in what.
 *
 * The value is always monospace with tabular figures, so a column of readings
 * lines up and a changing one does not shuffle its own digits. `emphasis`
 * raises the figure for the one reading a panel is actually about.
 *
 * `label` is optional on purpose. A panel whose header already names the
 * reading does not need it said twice, and an uppercase label over every
 * figure turns an instrument into a form.
 */
const Readout = ({ label, value, unit, emphasis }) => (
  <Root>
    {label && <Label>{label}</Label>}
    <Line>
      <Value emphasis={emphasis}>{value}</Value>
      {unit && <Unit emphasis={emphasis}>{unit}</Unit>}
    </Line>
  </Root>
);

export default Readout;
