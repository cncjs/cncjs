import {
  Toast,
  ToastController,
  ToastTransition,
  useColorStyle,
} from '@tonic-ui/react';
import React from 'react';
import { TransitionGroup } from 'react-transition-group';

const InlineToasts = inProps => {
  const [colorStyle] = useColorStyle();
  const {
    toasts = [],
  } = inProps;

  return (
    <TransitionGroup
      component={null} // Pass in `component={null}` to avoid a wrapping `<div>` element
    >
      {toasts.map(toast => (
        <ToastTransition
          key={toast?.id}
          in={true}
          unmountOnExit
        >
          <ToastController
            duration={toast?.duration}
            onClose={toast?.onClose}
          >
            <Toast
              appearance={toast?.appearance}
              isClosable={toast?.isClosable}
              onClose={toast?.onClose}
              sx={{
                mb: '2x',
                minWidth: 280, // The toast has a minimum width of 280 pixels
                width: 'fit-content',
                boxShadow: colorStyle.shadow.thin,
              }}
            >
              {toast?.content}
            </Toast>
          </ToastController>
        </ToastTransition>
      ))}
    </TransitionGroup>
  );
};

InlineToasts.displayName = 'InlineToasts';

export default InlineToasts;
