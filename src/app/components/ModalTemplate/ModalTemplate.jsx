import PropTypes from 'prop-types';
import React from 'react';
import styled from 'styled-components';
import { FlexContainer, Row, Col } from '../GridSystem';
import iconError from './icon-error-48.png';
import iconWarning from './icon-warning-48.png';
import iconInfo from './icon-info-48.png';
import iconSuccess from './icon-success-48.png';

const Icon = styled.i`
    vertical-align: top;
    display: inline-block;
    width: 48px;
    height: 48px;
    background-repeat: no-repeat;
`;

const Error = styled(Icon)`
    background-image: url(${iconError});
`;

const Warning = styled(Icon)`
    background-image: url(${iconWarning});
`;

const Info = styled(Icon)`
    background-image: url(${iconInfo});
`;

const Success = styled(Icon)`
    background-image: url(${iconSuccess});
`;

const ModalTemplate = ({ type, children, templateStyle }) => (
    <FlexContainer>
        <Row>
            <Col width="auto">
                {type === 'error' && <Error />}
                {type === 'warning' && <Warning />}
                {type === 'info' && <Info />}
                {type === 'success' && <Success />}
            </Col>
            <Col style={templateStyle}>
                {children}
            </Col>
        </Row>
    </FlexContainer>
);

ModalTemplate.propTypes = {
    type: PropTypes.oneOf([
        'error',
        'warning',
        'info',
        'success'
    ]),
    templateStyle: PropTypes.object,
};

export default ModalTemplate;
