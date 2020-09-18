import React from 'react';
import Box from 'app/components/Box';

const Space = React.forwardRef((props, ref) => (
  <Box
    ref={ref}
    display="inline-block"
    {...props}
  />
));

Space.displayName = 'Space';

export default Space;
