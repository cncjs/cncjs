import styled from 'styled-components';

const Ellipsis = styled.div`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const EllipsisBlock = styled(Ellipsis)`
    display: block;
`;

const EllipsisInlineBlock = styled(Ellipsis)`
    display: inline-block;
`;

export {
    EllipsisBlock,
    EllipsisInlineBlock
};
export default Ellipsis;
