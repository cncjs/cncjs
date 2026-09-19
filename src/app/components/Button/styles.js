import MuiButton from '@mui/material/Button';
import { styled } from '@mui/material/styles';

/**
 * Material's button, with Material taken off it.
 *
 * What is kept is the part worth having: the focus handling, the disabled
 * semantics, the keyboard behaviour. What goes is the radius, the elevation
 * and the ripple — an instrument answers a press by changing colour, at once.
 */
export const Root = styled(MuiButton)(({ theme }) => ({
  minHeight: theme.tokens.size.controlLarge,
  padding: theme.spacing(0, 2.5),
  boxShadow: 'none',
  '&:hover': {
    boxShadow: 'none',
    backgroundColor: theme.palette.primary.dark,
  },
  // A ring in the primary colour vanishes the moment it lands on a primary
  // button, so focus gets its own colour and sits outside the edge.
  '&:focus-visible': {
    outline: `${theme.tokens.focus.ringWidth} solid ${theme.tokens.color.focusRing}`,
    outlineOffset: theme.tokens.focus.ringOffset,
  },
}));
