import React from 'react';
import styled, { css } from 'styled-components';

const fixedWidthFontFamily = 'Consolas, Menlo, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace, serif';

const TextBase = ({ bold, color, fixedWidth, size, ...others }) => (<div {...others} />);

const Text = styled(TextBase)`${({
    bold,
    color,
    fixedWidth,
    size = 'inherit',
}) => css`
    display: inline-block;
    color: ${!!color ? color : 'inherit'};
    font-family: ${fixedWidth ? fixedWidthFontFamily : 'inherit'};
    font-size: ${Number(size) > 0 ? `${size}px` : size};
    font-weight: ${!!bold ? 'bold' : 'inherit'};
`}`;

export default Text;
