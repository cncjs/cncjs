import styled, { keyframes } from 'styled-components';

const fade = (from = 0, to = 1) => keyframes`
    0%, 100% { opacity: ${from}; }
    50% { opacity: ${to}; }
`;

const FadeInOut = styled.span`
    animation: ${props => (props.disabled ? 'none' : `${fade(props.from, props.to)} 2s linear infinite`)};
`;

export default FadeInOut;
