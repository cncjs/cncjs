import React from 'react';
import { Dot, Label, Root } from './styles';

/**
 * What state a machine is in.
 *
 * `tone` says how to colour it — `running`, `ready`, `stopped` or `inactive` —
 * and `children` is the word itself. The component does not know what a Grbl
 * state is called, which is what lets the same chip say "Idle" on a controller
 * panel and something else in the top bar without either of them owning it.
 *
 * The colour is carried by the dot rather than by the fill, so the chip stays
 * legible at a glance without shouting: a panel in which one element is a
 * block of red has nothing left to say when something is actually wrong.
 */
const StateChip = ({ tone = 'inactive', children, ...props }) => (
  <Root tone={tone} {...props}>
    <Dot tone={tone} aria-hidden="true" />
    <Label tone={tone}>{children}</Label>
  </Root>
);

export default StateChip;
