import {
  Box,
  Space,
} from '@trendmicro/react-styled-ui';
import React from 'react';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';

const InlineError = ({ children, ...props }) => (
  <Box
    {...props}
    display="inline-block"
    color="#db3d44"
    mt="1x"
  >
    <FontAwesomeIcon icon="exclamation-circle" fixedWidth />
    <Space width="1x" />
    {children}
  </Box>
);

export default InlineError;
