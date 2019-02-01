import styled, { css } from 'styled-components';

const Text = styled.div`${({
    bold,
    color,
    size = 'inherit',
}) => css`
    display: inline-block;
    background-color: inherit;
    color: ${!!color ? color : 'inherit'};
    vertical-align: middle;
    font-size: ${Number(size) > 0 ? `${size}px` : size};
    font-weight: ${!!bold ? 'bold' : 'inherit'};
    line-height: 1;
`}`;

export default Text;
