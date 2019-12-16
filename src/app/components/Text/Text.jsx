import React from 'react';
import Box from 'app/components/Box';

const Text = React.forwardRef((props, ref) => (
    <Box
        ref={ref}
        as="div"
        display="inline-block"
        {...props}
    />
));

Text.displayName = 'Text';

export default Text;
