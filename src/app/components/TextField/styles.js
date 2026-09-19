import FormControl from '@mui/material/FormControl';
import InputBase, { inputBaseClasses } from '@mui/material/InputBase';
import { styled } from '@mui/material/styles';

export const Field = styled(FormControl)(({ theme }) => ({
  gap: theme.spacing(0.75),
}));

/**
 * The label sits above the field and stays there.
 *
 * Material's floating label animates into the border and doubles as the
 * placeholder; on a panel read at arm's length that costs legibility for
 * decoration, and it leaves the field unlabelled the moment it has content.
 *
 * It keeps its colour when the field is in error. The red border and the red
 * message below carry that; recolouring the field's own name as well turns an
 * error into noise.
 */
export const Label = styled('label')(({ theme }) => ({
  ...theme.typography.overline,
  color: theme.palette.text.secondary,
}));

export const Input = styled(InputBase)(({ theme }) => ({
  border: `${theme.tokens.border.hairline} solid ${theme.tokens.color.borderControl}`,
  backgroundColor: theme.palette.background.paper,

  [`&.${inputBaseClasses.focused}`]: {
    borderColor: theme.palette.primary.main,
    outline: `${theme.tokens.focus.ringWidth} solid ${theme.tokens.color.focusRing}`,
    outlineOffset: theme.tokens.focus.ringOffset,
  },

  // After the focused rule on purpose: a field that is both focused and
  // rejected stays red, because the rejection is the thing to read.
  [`&.${inputBaseClasses.error}`]: {
    borderColor: theme.palette.error.main,
  },

  [`& .${inputBaseClasses.input}`]: {
    minHeight: theme.tokens.size.control,
    boxSizing: 'border-box',
    padding: theme.spacing(0, 1.5),
    fontSize: theme.typography.body1.fontSize,
  },
}));

export const HelperText = styled('p', {
  // Emotion would otherwise pass `error` through to the DOM node.
  shouldForwardProp: (prop) => prop !== 'error',
})(({ theme, error }) => ({
  ...theme.typography.caption,
  margin: 0,
  color: error ? theme.palette.error.main : theme.palette.text.secondary,
}));
