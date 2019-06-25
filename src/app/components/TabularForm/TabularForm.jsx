import styled from 'styled-components';

const TabularForm = styled.div`
    display: table;
`;

TabularForm.Row = styled.div`
    display: table-row;
`;

TabularForm.Col = styled.div`
    display: table-cell;

    ${props => props.condensed && `
        width: 0.1%;
    `}

    ${props => props.nowrap && `
        white-space: nowrap;
    `}
`;

export default TabularForm;
