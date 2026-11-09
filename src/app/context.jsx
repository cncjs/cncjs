import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  PortalManager,
  ToastManager,
  TonicProvider,
  useColorMode,
} from '@tonic-ui/react';
import {
  useConst,
  useEffectOnce,
} from '@tonic-ui/react-hooks';
import React, { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider as ReduxProvider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import theme from '@app/config/theme';
import i18next from '@app/i18next';
import '@app/runtime/connectionRuntimeSingleton';
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

function DocumentColorScheme() {
  const [colorMode] = useColorMode();
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute('data-color-scheme');
    root.setAttribute('data-color-scheme', colorMode);
    return () => {
      if (previous === null) {
        root.removeAttribute('data-color-scheme');
      } else {
        root.setAttribute('data-color-scheme', previous);
      }
    };
  }, [colorMode]);
  return null;
}

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
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
      setColorModeState(prevState => (
        prevState.useSystemColorMode === useSystemColorMode
          ? prevState
          : { ...prevState, useSystemColorMode }
      ));
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
          theme={theme}
          useCSSVariables={true}
          useCSSBaseline={true}
        >
          <DocumentColorScheme />
          <ToastManager
            placement="bottom-right"
            slotProps={{
              transition: {
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
              },
            }}
          >
            <PortalManager>
              <ReduxProvider store={reduxStore}>
                <HashRouter>
                  {children}
                </HashRouter>
              </ReduxProvider>
            </PortalManager>
          </ToastManager>
        </TonicProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
