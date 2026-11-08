import { createTheme } from '@tonic-ui/react';
import quietLight from './theme-colors.json';

// alpha.1 still points these three gradients at the retired `alert` namespace.
// Resolve them against the v3 chart tokens before generating global variables.
const riskLevel = Object.fromEntries(['high', 'medium', 'low'].map(level => [level, {
  _gradient: {
    opaque: {
      _dark: `{colors.riskLevel.${level}.chart._dark}`,
      _light: `{colors.riskLevel.${level}.chart._light}`,
    },
  },
}]));

// Quiet neutral chrome for light mode: soft gray surfaces, muted hairline
// borders, neutral text and focus ring (background #fff, fills #f5f5f5,
// border #e5e5e5, ring #a1a1a1, foreground #0a0a0a). Only the `_light` slots
// are overridden, so dark mode stays untouched. CNCjs identity is retained:
// blue primary/selected, status colors and domain-owned palettes.

export default createTheme({ colors: { ...quietLight, riskLevel } });
