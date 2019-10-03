import PropTypes from 'prop-types';
import React from 'react';
import styled, { css, keyframes } from 'styled-components';
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

const ImageIcon = styled(({
    spin,
    spinReverse,
    ...rest
}) => (
    <Image {...rest} />
))`
    display: inline-block;
    font-size: inherit;
    overflow: visible;
    vertical-align: -0.125em;
    ${props => {
        if (props.spin) {
            return css`animation: ${spin} 2s infinite linear;`;
        }
        if (props.spinReverse) {
            return css`animation: ${spinReverse} 2s infinite linear;`;
        }
        return '';
    }}
`;

ImageIcon.propTypes = {
    ...Image.propTypes,
    spin: PropTypes.bool,
    spinReverse: PropTypes.bool,
};

export default ImageIcon;
