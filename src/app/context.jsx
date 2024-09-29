import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  PortalManager,
  ToastManager,
  TonicProvider,
  theme,
} from '@tonic-ui/react';
import {
  useConst,
  useEffectOnce,
} from '@tonic-ui/react-hooks';
import React, { useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider as ReduxProvider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import { CardProvider } from '@app/components/Card';
import { Provider as GridSystemProvider } from '@app/components/GridSystem'; // TODO: remove this
import colorStyle from '@app/config/color-style';
import customIcons from '@app/config/icons';
import i18next from '@app/i18next';
import config from '@app/store/config';
import reduxStore from '@app/store/redux';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

const customTheme = {
  ...theme,
  icons: [
    ...theme.icons,
    ...customIcons,
  ],
};

export function GlobalProvider({ children }) {
  const initialColorModeState = useConst(() => {
    const appearance = config.get('settings.appearance') ?? 'auto'; // The appearance value is one of 'auto', 'light', 'dark'
    const useSystemColorMode = (appearance === 'auto');
    const defaultValue = (appearance === 'dark') ? 'dark' : 'light'; // The color mode value is one of 'light', 'dark'
    return {
      useSystemColorMode,
      defaultValue,
    };
  });
  const [colorModeState, setColorModeState] = useState(initialColorModeState);

  useEffectOnce(() => {
    const onChange = () => {
      // This callback is used to update the "useSystemColorMode" state
      //
      // | appearance | useSystemColorMode |
      // | :--------- | :----------------- |
      // | 'auto'     | true               |
      // | 'light'    | false              |
      // | 'dark'     | false              |
      const appearance = config.get('settings.appearance') ?? 'auto';
      const useSystemColorMode = (appearance === 'auto');
      if (colorModeState.useSystemColorMode !== useSystemColorMode) {
        setColorModeState(prevState => ({
          ...prevState,
          useSystemColorMode,
        }));
      }
    };
    config.on('change', onChange);
    return () => {
      config.off('change', onChange);
    };
  });

  return (
    <I18nextProvider i18n={i18next}>
      <QueryClientProvider client={queryClient}>
        <TonicProvider
          colorMode={colorModeState}
          colorStyle={{
            defaultValue: colorStyle,
          }}
          theme={customTheme}
          useCSSBaseline={true}
        >
          <ToastManager
            placement="bottom-right"
            TransitionProps={{
              sx: {
                '[data-toast-placement^="top"] > &:first-of-type': {
                  mt: '4x', // the space to the top edge of the screen
                },
                '[data-toast-placement^="bottom"] > &:last-of-type': {
                  mb: '4x', // the space to the bottom edge of the screen
                },
                '[data-toast-placement$="left"] > &': {
                  ml: '4x', // the space to the left edge of the screen
                },
                '[data-toast-placement$="right"] > &': {
                  mr: '4x', // the space to the right edge of the screen
                },
              },
            }}
          >
            <PortalManager>
              <ReduxProvider store={reduxStore}>
                <GridSystemProvider
                  breakpoints={[576, 768, 992, 1200, 1600]}
                  containerWidths={[540, 720, 960, 1140]}
                  columns={12}
                  gutterWidth={0}
                  layout="flexbox"
                >
                  <CardProvider
                    borderRadius={0}
                    spacingX=".75rem"
                    spacingY=".375rem"
                  >
                    <HashRouter>
                      {children}
                    </HashRouter>
                  </CardProvider>
                </GridSystemProvider>
              </ReduxProvider>
            </PortalManager>
          </ToastManager>
        </TonicProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
