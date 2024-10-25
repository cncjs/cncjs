import {
  Box,
  Toast,
  useColorMode,
  useColorStyle,
  useToastManager,
} from '@tonic-ui/react';
import React, { useCallback } from 'react';

const ToastLayout = (props) => {
  const [colorMode] = useColorMode();
  const [colorStyle] = useColorStyle({ colorMode });
  const boxShadow = colorStyle.shadow.thin;

  return (
    <Box
      fontSize="sm"
      lineHeight="sm"
      textAlign="left"
      boxShadow={boxShadow}
      {...props}
    />
  );
};

const useToast = () => {
  const toast = useToastManager();

  /**
   * Positive information toast can be dismissed automatically in 5 seconds.
   * Error and warning toasts should be persistent until dismissed by the user.
   */
  return useCallback(({
    appearance,
    content,
    duration,
    placement = 'bottom-right',
    width = 320,
  }) => {
    if (duration === undefined) {
      const isPositiveInformation = (!appearance || appearance === 'none' || appearance === 'success' || appearance === 'info');
      duration = isPositiveInformation ? 5000 : null;
    }

    const render = ({ onClose, placement }) => {
      const isTop = placement.includes('top');
      const toastSpacingKey = isTop ? 'pb' : 'pt';
      const styleProps = {
        [toastSpacingKey]: '2x',
        width,
      };

      return (
        <ToastLayout sx={styleProps}>
          <Toast
            appearance={appearance}
            isClosable
            onClose={onClose}
          >
            {content}
          </Toast>
        </ToastLayout>
      );
    };
    const options = {
      placement,
      duration,
    };

    toast.notify(render, options);
  }, [toast]);
};

export default useToast;
