import React from 'react';
import { Body, Header, Root, Title } from './styles';

/**
 * A titled panel: header bar plus content.
 *
 * This is the one repeating container in the design — the machine panel is
 * made of these, and so is a form. It takes its size from whatever holds it
 * and assumes nothing about whether that is a grid cell, a column or a whole
 * screen.
 */
const Tile = ({ title, children }) => (
  <Root>
    <Header>
      <Title>{title}</Title>
    </Header>
    <Body>
      {children}
    </Body>
  </Root>
);

export default Tile;
