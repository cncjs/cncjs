import React from 'react';
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import createAppTheme from './createAppTheme';

// One theme for the whole application, built once. Nothing about it depends on
// where it is mounted, so rebuilding it per render would only cost emotion its
// cache.
const theme = createAppTheme();

/**
 * Wraps the application so migrated subtrees can reach the theme.
 *
 * There is deliberately no `CssBaseline` here. A global baseline would repaint
 * every screen that has not been migrated yet, and this project is migrating
 * one screen at a time — so each migrated screen carries its own
 * `ScopedCssBaseline` instead, and bootstrap stays untouched everywhere else.
 * The last screen to move is what turns this into a global baseline.
 *
 * `injectFirst` puts emotion's stylesheet at the top of `<head>`, ahead of the
 * bootstrap and Stylus sheets webpack injects, so that during the migration
 * the old styles still win wherever the two systems meet.
 */
const AppThemeProvider = ({ children }) => (
  <StyledEngineProvider injectFirst>
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  </StyledEngineProvider>
);

export default AppThemeProvider;
