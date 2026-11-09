import {
  Button,
  Link,
} from '@tonic-ui/react';
import React, { forwardRef } from 'react';

const AlertButtonLink = forwardRef((props, ref) => {
  const borderColor = 'border.primary';
  const color = 'text.primary';
  const _hoverBackgroundColor = 'actions.hovered';

  return (
    <Button
      as={Link}
      ref={ref}
      variant="secondary"
      size="sm"
      borderColor={borderColor}
      color={color}
      _active={{ color }}
      _focus={{ color }}
      _hover={{
        backgroundColor: _hoverBackgroundColor,
        color,
        textDecoration: 'none',
      }}
      _visited={{ color }}
      {...props}
    />
  );
});

AlertButtonLink.displayName = 'AlertButtonLink';

export default AlertButtonLink;
