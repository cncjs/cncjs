import React from 'react';
import Box from 'app/components/Box';

const Text = React.forwardRef((props, ref) => (
    <Box
        ref={ref}
        display="inline-block"
        fontFamily="base"
        {...props}
    />
));

Text.displayName = 'Text';

export default Text;
