import styled from 'styled-components';
import Card from 'app/components/Card';

const OverrideReadout = styled(Card)`
    display: inline-block;
    font-size: .75rem;
    font-weight: bold;
    width: 45px;
    padding: .25rem;
    text-align: right;
    background-color: rgba(0, 0, 0, 0.03);
`;

export default OverrideReadout;
