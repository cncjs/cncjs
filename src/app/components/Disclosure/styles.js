import { styled } from '@mui/material/styles';

export const Root = styled('section')(({ theme }) => ({
  borderTop: `${theme.tokens.border.hairline} solid ${theme.tokens.color.borderSubtle}`,
}));

/**
 * The whole strip is the control, not an icon at the end of it.
 *
 * A disclosure whose hit area is a 12px chevron is a disclosure nobody uses on
 * a machine next to a running spindle. This one is the full width of the
 * panel and as tall as any other control.
 */
export const Summary = styled('button')(({ theme }) => ({
  ...theme.typography.overline,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  width: '100%',
  minHeight: theme.tokens.size.control,
  padding: theme.spacing(0, 0.5),
  background: 'none',
  border: 0,
  color: theme.palette.text.secondary,
  cursor: 'pointer',
  '&:hover': {
    color: theme.palette.primary.main,
  },
  '&:focus-visible': {
    outline: `${theme.tokens.focus.ringWidth} solid ${theme.tokens.color.focusRing}`,
    outlineOffset: `-${theme.tokens.focus.ringWidth}`,
  },
}));

/**
 * Points down when the section is open, right when it is shut.
 *
 * Rotated rather than swapped for a second glyph, so the two states are
 * visibly the same object in two positions — which is what a disclosure is.
 */
export const Chevron = styled('svg', {
  shouldForwardProp: (prop) => prop !== 'expanded',
})(({ expanded }) => ({
  flex: 'none',
  marginLeft: 'auto',
  transform: expanded ? 'rotate(90deg)' : 'none',
}));

export const Content = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 0.5, 1.5),
}));
