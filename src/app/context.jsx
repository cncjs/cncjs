import {
  TonicProvider,
  ToastProvider,
  theme,
} from '@tonic-ui/react';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider as ReduxProvider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import { CardProvider } from 'app/components/Card';
import { Provider as GridSystemProvider } from 'app/components/GridSystem'; // TODO: remove this
import { PortalManager } from 'app/components/PortalManager';
import colorStyle from 'app/config/color-style';
import customIcons from 'app/config/icons';
import i18next from 'app/i18next';
import reduxStore from 'app/store/redux';

const customTheme = {
  ...theme,
  icons: {
    ...theme.icons,
    ...customIcons,
  },
};

export function GlobalProvider({ children }) {
  return (
    <TonicProvider
      colorMode={{
        defaultValue: 'dark', // One of: 'dark', 'light'
      }}
      colorStyle={{
        defaultValue: colorStyle,
      }}
      theme={customTheme}
      useCSSBaseline={true}
    >
      <PortalManager>
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
      </PortalManager>
    </TonicProvider>
  );
}
