import { SVGIcon } from '@tonic-ui/react-icons';
import React, { forwardRef } from 'react';

const ModalSuccessIcon = forwardRef((props, ref) => (
  <SVGIcon
    ref={ref}
    viewBox="0 0 48 48"
    {...props}
  >
    <path d="M20.4 28.6L13.4 21.6L10.5 24.4L20.4 34.5L37.5 16.3L34.6 13.5L20.4 28.6ZM24 0C10.7 0 0 10.7 0 24C0 37.3 10.7 48 24 48C37.3 48 48 37.3 48 24C48 10.8 37.3 0 24.1 0H24ZM24 46C11.8 46 2 36.2 2 24C2 11.8 11.8 2 24 2C36.2 2 46 11.8 46 24C46 36.1 36.2 46 24.1 46H24Z" />
  </SVGIcon>
));
ModalSuccessIcon.displayName = 'ModalSuccessIcon';

export default ModalSuccessIcon;
