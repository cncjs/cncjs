import React from 'react';
import { Label, Root, Row, Value } from './styles';

/**
 * Secondary readings, as a definition list.
 *
 * `items` is a list of `{ label, value }`. A real `<dl>` rather than rows of
 * divs, because that is what this is: each label names the figure beside it,
 * and assistive technology can then read the pair rather than two loose
 * strings.
 */
const Details = ({ items }) => (
  <Root>
    {items.map(({ label, value }) => (
      <Row key={label}>
        <Label>{label}</Label>
        <Value>{value}</Value>
      </Row>
    ))}
  </Root>
);

export default Details;
