import {
  ThemeProvider,
  ColorModeProvider,
} from '@trendmicro/react-styled-ui';
import memoize from 'micro-memoize';
import React from 'react';
import { StyledUIContext } from './context';

const getMemoizedState = memoize(state => ({ ...state }));

const StyledUIProvider = ({
  context: Context = StyledUIContext,
  theme,
  colorMode,
  colorStyles,
  layoutStyles,
  children,
}) => {
  const memoizedState = getMemoizedState({ colorStyles, layoutStyles });

  return (
    <ThemeProvider value={theme}>
      <ColorModeProvider value={colorMode}>
        <Context.Provider value={memoizedState}>
          {children}
        </Context.Provider>
      </ColorModeProvider>
    </ThemeProvider>
  );
};

export default StyledUIProvider;
