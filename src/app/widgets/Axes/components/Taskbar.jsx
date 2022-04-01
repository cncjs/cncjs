import React from 'react';
import TaskbarButton from './TaskbarButton';

function Taskbar({ children, style, ...props }) {
  return (
    <div
      {...props}
      style={{
        borderTop: '1px solid #ddd',
        ...style
      }}
    >
      {children}
    </div>
  );
}

Taskbar.Button = TaskbarButton;

export default Taskbar;
