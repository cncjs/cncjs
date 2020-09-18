import { Global, css } from '@emotion/core';
import React from 'react';
import baseCSS from './base-css';
import normalizeCSS from './normalize-css';

const globalStyles = theme => css([
  normalizeCSS(theme),
  baseCSS(theme),
]);

const CSSBaseline = () => {
  return (
    <Global styles={globalStyles} />
  );
};

export default CSSBaseline;
