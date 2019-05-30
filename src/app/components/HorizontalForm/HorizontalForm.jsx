import styled from 'styled-components';

const FormLabel = styled.label`
    display: inline-block;
    margin-bottom: 0;
`;

const FormContainer = styled.div`
    display: table;
`;

const FormRow = styled.div`
    display: table-row;
    margin-bottom: 4px;
`;

const FormCol = styled.div`
    display: table-cell;
    vertical-align: top;
    padding-bottom: 4px;

    & > ${FormLabel} {
        padding-right: 12px;
    }
`;

const HorizontalForm = ({ children }) => {
    if (typeof children === 'function') {
        return children({ FormContainer, FormRow, FormCol, FormLabel });
    }

    return children;
};

export { FormContainer, FormRow, FormCol, FormLabel };
export default HorizontalForm;
