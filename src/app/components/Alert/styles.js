import { styled } from '@mui/material/styles';

/**
 * An error states itself in the panel's own grammar — hairline, square, a
 * tracked uppercase title — and carries no tinted fill, because the palette
 * has no tint for it and inventing one here is exactly the drift the token
 * file exists to prevent. The border and the title carry the colour.
 */
export const Root = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(1.5),
  padding: theme.spacing(1.5, 2),
  backgroundColor: theme.palette.background.paper,
  border: `${theme.tokens.border.hairline} solid ${theme.palette.error.main}`,
  borderLeftWidth: theme.tokens.border.emphasis,
}));

export const Content = styled('div')({
  flex: 1,
  minWidth: 0,
});

export const Title = styled('div')(({ theme }) => ({
  ...theme.typography.overline,
  color: theme.palette.error.main,
}));

export const Message = styled('div')(({ theme }) => ({
  fontSize: theme.typography.body1.fontSize,
  lineHeight: theme.typography.body1.lineHeight,
}));

export const Dismiss = styled('button')(({ theme }) => ({
  flex: 'none',
  padding: 0,
  width: theme.spacing(3),
  height: theme.spacing(3),
  background: 'none',
  border: 0,
  cursor: 'pointer',
  color: theme.palette.text.secondary,
  font: 'inherit',
  lineHeight: 1,
  '&:hover': {
    color: theme.palette.error.main,
  },
  '&:focus-visible': {
    outline: `${theme.tokens.focus.ringWidth} solid ${theme.tokens.color.focusRing}`,
    outlineOffset: theme.tokens.focus.ringOffset,
  },
}));
