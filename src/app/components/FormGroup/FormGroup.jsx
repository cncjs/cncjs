import { Box } from '@tonic-ui/react';
import React, { forwardRef } from 'react';

const FormGroup = forwardRef((props, ref) => (
  <Box
    ref={ref}
    mb="4x"
    {...props}
  />
));

export default FormGroup;
