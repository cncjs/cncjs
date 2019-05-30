import PropTypes from 'prop-types';
import styled, { keyframes } from 'styled-components';
import Image from 'app/components/Image';

const spin = keyframes`
    0% {
        transform: rotate(0eg);
    }
    100% {
        transform: rotate(359deg);
    }
`;

const spinReverse = keyframes`
    0% {
        transform: rotate(359deg);
    }
    100% {
        transform: rotate(0deg);
    }
`;

const ImageIcon = styled(Image)`
    display: inline-block;
    font-size: inherit;
    height: 1em;
    overflow: visible;
    vertical-align: -0.125em;
    ${props => !!props.spin && `animation: ${spin} 2s infinite linear;`}
    ${props => !!props.spinReverse && `animation: ${spinReverse} 2s infinite linear;`}
`;

ImageIcon.propTypes = {
    ...Image.propTypes,
    spin: PropTypes.bool,
    spinReverse: PropTypes.bool,
};

export default ImageIcon;
