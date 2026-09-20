import MuiButton from '@mui/material/Button';
import { styled } from '@mui/material/styles';

/**
 * Material's button, with Material taken off it.
 *
 * What is kept is the part worth having: the focus handling, the disabled
 * semantics, the keyboard behaviour. What goes is the radius, the elevation
 * and the ripple — an instrument answers a press by changing colour, at once.
 *
 * Two dimensions vary, and only two. `variant="outlined"` is the button that
 * is not the point of the panel — an adjustment, a secondary path — and it is
 * drawn as a hairline box that takes the accent only on hover. `size="small"`
 * steps down from the token for a control that is the point of the panel to
 * the token for one of several in a row; it is not a density mode, and there
 * is no third step.
 */
export const Root = styled(MuiButton)(({ theme, size, variant }) => ({
  minHeight: size === 'small' ? theme.tokens.size.control : theme.tokens.size.controlLarge,
  padding: size === 'small' ? theme.spacing(0, 1) : theme.spacing(0, 2.5),
  // Stated rather than inherited. Material sizes its small button in rem, and
  // rem resolves against a root this application does not own — which landed
  // the label at 11.3px, a size nothing in the token scale contains.
  fontSize: size === 'small' ? theme.tokens.fontSize.small : theme.typography.button.fontSize,
  // A control label that wraps is a control whose own name is unreadable, and
  // these sit five to a row.
  whiteSpace: 'nowrap',
  boxShadow: 'none',
  ...(variant === 'outlined'
    ? {
      backgroundColor: theme.palette.background.paper,
      borderColor: theme.tokens.color.borderControl,
      color: theme.palette.text.primary,
      '&:hover': {
        backgroundColor: theme.palette.background.paper,
        borderColor: theme.palette.primary.main,
        color: theme.palette.primary.main,
      },
    }
    : {
      '&:hover': {
        boxShadow: 'none',
        backgroundColor: theme.palette.primary.dark,
      },
    }),
  // A ring in the primary colour vanishes the moment it lands on a primary
  // button, so focus gets its own colour and sits outside the edge.
  '&:focus-visible': {
    outline: `${theme.tokens.focus.ringWidth} solid ${theme.tokens.color.focusRing}`,
    outlineOffset: theme.tokens.focus.ringOffset,
  },
}));
