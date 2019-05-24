import React from 'react';
import styled from 'styled-components';
import Hoverable from 'app/components/Hoverable';

const Component = styled(Hoverable)`
    &:hover {
        cursor: pointer;
    }
`;

const Clickable = (props) => (
    <Component role="presentation" {...props} />
);

export default Clickable;
