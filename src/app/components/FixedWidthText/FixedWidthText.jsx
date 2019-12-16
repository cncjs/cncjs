import React from 'react';
import Text from 'app/components/Text';

const fixedWidthFontFamily = 'Consolas, Menlo, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace, serif';

const FixedWidthText = React.forwardRef((props, ref) => (
    <Text ref={ref} fontFamily={fixedWidthFontFamily} {...props} />
));

FixedWidthText.displayName = 'FixedWidthText';

export default FixedWidthText;
