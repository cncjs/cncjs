import PropTypes from 'prop-types';
import React from 'react';
import styled from 'styled-components';
import { Container, Row, Col } from 'app/components/GridSystem';
import Space from 'app/components/Space';
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

const PrimaryMessage = styled.div`
    font-weight: bold;
    padding-bottom: .25rem;
`;

const DescriptiveMessage = styled.div`
    font-weight: normal;
`;

const ModalTemplate = ({ type, children, style }) => (
  <Container>
    <Row>
      <Col width="auto">
        {type === 'error' && <Error />}
        {type === 'warning' && <Warning />}
        {type === 'info' && <Info />}
        {type === 'success' && <Success />}
        <Space width={16} />
      </Col>
      <Col style={{ paddingTop: 4, ...style }}>
        {(typeof children === 'function')
          ? children({ PrimaryMessage, DescriptiveMessage })
          : children
        }
      </Col>
    </Row>
  </Container>
);

ModalTemplate.propTypes = {
  type: PropTypes.oneOf([
    'error',
    'warning',
    'info',
    'success'
  ])
};

export default ModalTemplate;
