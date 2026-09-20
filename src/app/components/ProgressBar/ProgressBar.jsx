import React from 'react';
import { Fill, Track } from './styles';

/**
 * How far through something is.
 *
 * `role="progressbar"` with the three `aria-value*` attributes is what makes
 * the figure available to anything that is not looking at the fill — the width
 * of a coloured bar is not a reading.
 */
const ProgressBar = ({ percent, label }) => (
  <Track
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={percent}
    aria-label={label}
  >
    <Fill percent={percent} />
  </Track>
);

export default ProgressBar;
