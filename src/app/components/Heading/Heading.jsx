import React, { forwardRef } from 'react';
import Box from 'app/components/Box';

const Heading = forwardRef((props, ref) => (
  <Box
    ref={ref}
    fontFamily="heading"
    {...props}
  />
));

Heading.displayName = 'Heading';

export default Heading;
