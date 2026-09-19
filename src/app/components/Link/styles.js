import MuiLink from '@mui/material/Link';
import { styled } from '@mui/material/styles';

export const Root = styled(MuiLink)(({ theme }) => ({
  color: theme.palette.primary.main,
  fontSize: theme.typography.body1.fontSize,
  '&:hover': {
    color: theme.palette.primary.dark,
  },
  '&:focus-visible': {
    outline: `${theme.tokens.focus.ringWidth} solid ${theme.tokens.color.focusRing}`,
    outlineOffset: theme.tokens.focus.ringOffset,
  },
}));
