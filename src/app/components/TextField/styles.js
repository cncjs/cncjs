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

  [`& .${inputBaseClasses.input}`]: {
    minHeight: theme.tokens.size.control,
    boxSizing: 'border-box',
    padding: theme.spacing(0, 1.5),
    fontSize: theme.typography.body1.fontSize,
  },
}));
