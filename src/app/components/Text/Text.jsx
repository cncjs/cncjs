import styled, { css } from 'styled-components';

const Text = styled.div`${({
    bold,
    color,
    size = 'inherit',
}) => css`
    display: inline-block;
    color: ${!!color ? color : 'inherit'};
    font-size: ${Number(size) > 0 ? `${size}px` : size};
    font-weight: ${!!bold ? 'bold' : 'inherit'};
`}`;

export default Text;
