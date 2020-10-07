import {
  Text,
} from '@trendmicro/react-styled-ui';
import React from 'react';

const fixedWidthFontFamily = 'Consolas, Menlo, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace, serif';

const FixedWidthText = React.forwardRef((props, ref) => (
  <Text ref={ref} fontFamily={fixedWidthFontFamily} {...props} />
));

FixedWidthText.displayName = 'FixedWidthText';

export default FixedWidthText;
