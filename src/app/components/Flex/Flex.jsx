import React, { forwardRef } from 'react';
import Box from 'app/components/Box';

const Flex = forwardRef((
    {
        direction,
        wrap,
        align,
        justify,
        ...rest
    },
    ref
) => (
    <Box
        ref={ref}
        display="flex"
        flexDirection={direction}
        flexWrap={wrap}
        alignItems={align}
        justifyContent={justify}
        {...rest}
    />
));

Flex.displayName = 'Flex';

export default Flex;
