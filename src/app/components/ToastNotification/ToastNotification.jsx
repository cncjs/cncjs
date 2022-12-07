import {
  Collapse,
  Toast,
} from '@tonic-ui/react';
import { noop } from '@tonic-ui/utils';
import React, { forwardRef, useCallback, useEffect, useState } from 'react';
import { useToastNotificationStyle } from './styles';

const ToastNotification = forwardRef((
  {
    TransitionComponent = Collapse,
    TransitionProps,
    autoClose = false,
    autoCloseTimeout = 5000,
    defaultIsOpen = true,
    isClosable,
    isOpen: isOpenProp,
    onClose: onCloseProp,
    ...rest
  },
  ref,
) => {
  const [isOpen, setIsOpen] = useState(isOpenProp ?? defaultIsOpen);

  useEffect(() => {
    const isControlled = (isOpenProp !== undefined);
    if (isControlled) {
      setIsOpen(isOpenProp);
    }
  }, [isOpenProp]);

  const onClose = useCallback(() => {
    const isControlled = (isOpenProp !== undefined);
    if (!isControlled) {
      setIsOpen(false);
    }

    if (typeof onCloseProp === 'function') {
      onCloseProp();
    }
  }, [isOpenProp, onCloseProp]);

  useEffect(() => {
    if (!autoClose) {
      return noop;
    }

    let timer = null;
    timer = setTimeout(() => {
      onClose();
      timer = null;
    }, autoCloseTimeout);

    return () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
  }, [autoClose, autoCloseTimeout, onClose]);

  const styleProps = useToastNotificationStyle();

  return (
    <TransitionComponent
      in={isOpen}
      {...TransitionProps}
    >
      <Toast
        isClosable={isClosable}
        onClose={onClose}
        {...styleProps}
        {...rest}
      />
    </TransitionComponent>
  );
});

export default ToastNotification;
