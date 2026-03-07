import React, { useContext } from 'react';
import Card from '@app/components/Card';
import Clickable from '@app/components/Clickable';
import { CollapsibleCardContext } from './context';

function Header({ children, style, ...props }) {
  const { collapsed, collapsing, toggle } = useContext(CollapsibleCardContext);

  return (
    <Clickable
      role="button"
      tabIndex={0}
      aria-expanded={!collapsed}
      onClick={toggle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle();
        }
      }}
      style={{ width: '100%' }}
    >
      {({ hovered }) => (
        <Card.Header
          {...props}
          style={{
            backgroundColor: hovered ? 'rgba(0, 0, 0, 0.075)' : 'rgba(0, 0, 0, 0.05)',
            borderBottomWidth: (collapsed && !collapsing) ? 0 : 1,
            ...style,
          }}
        >
          {typeof children === 'function'
            ? children({ collapsed, collapsing, toggle, hovered })
            : children}
        </Card.Header>
      )}
    </Clickable>
  );
}

export default Header;
