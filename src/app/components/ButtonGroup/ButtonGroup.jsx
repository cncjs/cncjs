import React from 'react';
import { Root } from './styles';

/**
 * Several controls that belong to one figure.
 *
 * Feed rate down and feed rate up are not two buttons that happen to be next
 * to each other; they are one adjustment with a direction. Grouping them says
 * so, and stops a row of five from reading as five unrelated decisions.
 *
 * `label` names the group for anything that cannot see that the buttons are
 * touching.
 */
const ButtonGroup = ({ label, children }) => (
  <Root role="group" aria-label={label}>
    {children}
  </Root>
);

export default ButtonGroup;
