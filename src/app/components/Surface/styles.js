import ScopedCssBaseline from '@mui/material/ScopedCssBaseline';
import { styled } from '@mui/material/styles';

/**
 * The boundary of migrated UI.
 *
 * `ScopedCssBaseline` applies the reset and the surface colour to this element
 * and its children only, which is what makes a screen-at-a-time migration
 * possible: everything still on bootstrap keeps rendering exactly as it did.
 * Every migrated subtree starts at one of these, whether it is a whole screen
 * or the contents of one widget inside the old chrome.
 */
export const Root = styled(ScopedCssBaseline)({
  height: '100%',
  // MUI paints the page colour here by default. A surface does not know what
  // it is sitting on — a screen is the page, a widget is a white panel — so it
  // takes the colour underneath and lets whoever knows set it.
  backgroundColor: 'transparent',
});
