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

  return useCallback(({
    appearance,
    content,
    duration = 3000,
    placement = 'bottom-right',
    width = 320,
  }) => {
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
      placement: 'bottom-right',
      duration,
    };

    toast.notify(render, options);
  }, [toast]);
};

export default useToast;
