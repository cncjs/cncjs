import React, { useCallback } from 'react';
import toaster from 'toasted-notes';
import { ColorModeProvider, ThemeProvider, useColorMode, useTheme } from '@trendmicro/react-styled-ui';

const useToast = () => {
  const theme = useTheme();
  const { colorMode } = useColorMode();
  const notify = useCallback(
    ({
      position = 'top',
      duration = 5000,
      render,
    }) => {
      const options = {
        position,
        duration,
      };

      if (typeof render !== 'function') {
        return null;
      }

      return toaster.notify(
        ({ id, onClose }) => (
          <ThemeProvider theme={theme}>
            <ColorModeProvider value={colorMode}>
              {render({ id, onClose, position, duration })}
            </ColorModeProvider>
          </ThemeProvider>
        ),
        options,
      );
    },
    [theme, colorMode],
  );
  const closeAll = toaster.closeAll;

  return {
    closeAll,
    notify,
  };
};

export default useToast;
