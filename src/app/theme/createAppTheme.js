import { createTheme } from '@mui/material/styles';
import {
  border,
  color,
  focus,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  size,
  spacingUnit,
} from './tokens';

/**
 * The MUI theme, assembled from `tokens.js` and nothing else.
 *
 * What MUI is being taken for here is behaviour — focus management, portals,
 * transitions, accessibility — not appearance. So the theme spends most of its
 * length switching Material's appearance off: no radius, no elevation, no
 * ripple. What is left is a flat technical panel drawn in hairlines.
 */
const createAppTheme = () => createTheme({
  spacing: spacingUnit,

  shape: {
    borderRadius: 0,
  },

  palette: {
    mode: 'light',
    primary: {
      main: color.accent,
      dark: color.accentHover,
      contrastText: color.onAccent,
    },
    error: {
      main: color.danger,
      dark: color.dangerHover,
      contrastText: color.onAccent,
    },
    background: {
      default: color.surface,
      paper: color.panel,
    },
    text: {
      primary: color.text,
      secondary: color.textMuted,
    },
    divider: color.border,
  },

  typography: {
    fontFamily: fontFamily.sans,
    fontSize: parseInt(fontSize.body, 10),
    body1: {
      fontSize: fontSize.body,
      lineHeight: lineHeight.body,
    },
    // The uppercase, letter-spaced label that names a field, a panel or a
    // reading. It is the most repeated piece of type in the whole design.
    overline: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.label,
      fontWeight: fontWeight.semibold,
      letterSpacing: letterSpacing.label,
      lineHeight: lineHeight.tight,
      textTransform: 'uppercase',
    },
    h1: {
      fontSize: fontSize.screenTitle,
      fontWeight: fontWeight.semibold,
      letterSpacing: letterSpacing.title,
      lineHeight: lineHeight.tight,
      textTransform: 'uppercase',
    },
    // The message under a field: small, and never uppercase — it is a
    // sentence, not a label.
    caption: {
      fontSize: fontSize.small,
      lineHeight: lineHeight.body,
    },
    button: {
      fontSize: fontSize.control,
      fontWeight: fontWeight.semibold,
      letterSpacing: letterSpacing.control,
      textTransform: 'uppercase',
    },
  },

  // Machine readings are not typography in the usual sense: they are an
  // instrument face. Anything showing a number reaches for this rather than
  // spelling out the family and the figure setting again.
  readout: {
    fontFamily: fontFamily.mono,
    fontWeight: fontWeight.medium,
    fontVariantNumeric: 'tabular-nums',
  },

  tokens: {
    border,
    color,
    focus,
    size,
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // `ScopedCssBaseline` paints the surface for whatever subtree it wraps,
        // which is how a migrated screen gets the new background without a
        // global baseline that would repaint the rest of the application.
        body: {
          backgroundColor: color.surface,
          color: color.text,
        },
      },
    },

    MuiButtonBase: {
      defaultProps: {
        // Material's ink ripple belongs to a different design language. The
        // panel answers a press by changing colour, immediately.
        disableRipple: true,
      },
    },
  },
});

export default createAppTheme;
