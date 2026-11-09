import { Button } from '@tonic-ui/react';
import React from 'react';
import useRepeatableAction from './useRepeatableAction';

/**
 * @param {{ onClick?: (event: Event) => void, disabled?: boolean, children?: React.ReactNode, [key: string]: unknown }} props
 */
function RepeatableButton({ onClick, disabled = false, ...props }) {
  const handlers = useRepeatableAction(onClick, disabled);
  const composed = Object.fromEntries(Object.entries(handlers).map(([name, handler]) => [name, event => {
    props[name]?.(event);
    if (!event.defaultPrevented || name === 'onKeyUp') {
      handler(event);
    }
  }]));
  return <Button {...props} {...composed} disabled={disabled} />;
}

export default RepeatableButton;
