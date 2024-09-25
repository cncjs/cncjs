import React from 'react';
import Repeatable from 'react-repeatable';
import { Button } from '@app/components/Buttons';

function RepeatableButton({ tag = Button, onClick, ...props }) {
  return (
    <Repeatable
      tag={tag}
      repeatDelay={500}
      repeatInterval={Math.floor(1000 / 15)}
      onHold={onClick}
      onRelease={onClick}
      {...props}
    />
  );
}

export default RepeatableButton;
