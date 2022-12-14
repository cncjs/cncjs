import {
  TonicProvider,
  ToastProvider,
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
import { CardProvider } from 'app/components/Card';
import { Provider as GridSystemProvider } from 'app/components/GridSystem'; // TODO: remove this
import { PortalProvider } from 'app/components/Portal';
import colorStyle from 'app/config/color-style';
import customIcons from 'app/config/icons';
import i18next from 'app/i18next';
import config from 'app/store/config';
import reduxStore from 'app/store/redux';

const customTheme = {
  ...theme,
  icons: {
    ...theme.icons,
    ...customIcons,
  },
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
    <TonicProvider
      colorMode={colorModeState}
      colorStyle={{
        defaultValue: colorStyle,
      }}
      theme={customTheme}
      useCSSBaseline={true}
    >
      <PortalProvider>
        <ToastProvider placement="bottom-right">
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
                <I18nextProvider i18n={i18next}>
                  <HashRouter>
                    {children}
                  </HashRouter>
                </I18nextProvider>
              </CardProvider>
            </GridSystemProvider>
          </ReduxProvider>
        </ToastProvider>
      </PortalProvider>
    </TonicProvider>
  );
}
