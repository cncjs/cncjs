import styled, { css } from 'styled-components';

const Text = styled.div`${({
    size = 'inherit',
    bold
}) => css`
    display: inline-block;
    color: inherit;
    background-color: inherit;
    vertical-align: middle;
    font-size: ${Number(size) > 0 ? `${size}px` : size};
    font-weight: ${!!bold ? 'bold' : 'inherit'};
    line-height: 1;
`}`;

export default Text;
