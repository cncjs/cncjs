import React from 'react';
import { Label, Root, Row, Value } from './styles';

/**
 * Secondary readings, as a definition list.
 *
 * `items` is a list of `{ label, value, name }`. A real `<dl>` rather than rows
 * of divs, because that is what this is: each label names the figure beside
 * it, and assistive technology can then read the pair rather than two loose
 * strings.
 *
 * `name` is optional and is the machine's own name for the figure — the
 * controller field rather than the English on screen. It lands on the value as
 * `data-reading`, so anything reading this panel out of the DOM finds the
 * figure without depending on how its label is worded or which language it is
 * worded in.
 */
const Details = ({ items }) => (
  <Root>
    {items.map(({ label, value, name }) => (
      <Row key={name || label}>
        <Label>{label}</Label>
        <Value data-reading={name}>{value}</Value>
      </Row>
    ))}
  </Root>
);

export default Details;
