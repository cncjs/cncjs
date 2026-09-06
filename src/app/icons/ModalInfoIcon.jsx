import { SVGIcon } from '@tonic-ui/react-icons';
import React, { forwardRef } from 'react';

const ModalInfoIcon = forwardRef((props, ref) => (
  <SVGIcon
    ref={ref}
    viewBox="0 0 48 48"
    {...props}
  >
    <path d="M23.9 0C10.7 0 0 10.8 0 24C0 37.2 10.8 47.9 24 47.9C37.2 47.9 47.9 37.1 47.9 23.9C47.9 10.7 37.2 0 24 0H23.9ZM23.9 46C11.8 46 2 36.1 2 24C2 11.9 11.9 2.1 24 2.1C36.1 2.1 45.9 12 45.9 24.1C45.8 36.2 36.1 46 24 46H23.9ZM21.9 20H25.9V36H21.9V20ZM21.9 12H25.9V16H21.9V12Z" />
  </SVGIcon>
));
ModalInfoIcon.displayName = 'ModalInfoIcon';

export default ModalInfoIcon;
