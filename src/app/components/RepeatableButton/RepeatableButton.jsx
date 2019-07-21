import React from 'react';
import Repeatable from 'react-repeatable';
import { Button } from 'app/components/Buttons';

const RepeatableButton = ({ tag = Button, onClick, ...props }) => (
    <Repeatable
        tag={tag}
        repeatDelay={500}
        repeatInterval={Math.floor(1000 / 15)}
        onHold={onClick}
        onRelease={onClick}
        {...props}
    />
);

export default RepeatableButton;
