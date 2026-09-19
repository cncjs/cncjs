import { styled } from '@mui/material/styles';

export const Root = styled('div')({
  minWidth: 0,
});

export const Label = styled('div')(({ theme }) => ({
  ...theme.typography.overline,
  color: theme.palette.text.secondary,
}));

export const Line = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'baseline',
  gap: theme.spacing(0.75),
}));

/**
 * The reading itself: monospace with tabular figures.
 *
 * This is the one piece of typography in the whole design that is functional
 * rather than decorative. A proportional face gives `1` a different width from
 * `8`, so a position or a line count jitters sideways as it updates and cannot
 * be read at a glance while the machine is moving.
 */
export const Value = styled('div', {
  shouldForwardProp: (prop) => prop !== 'emphasis',
})(({ theme, emphasis }) => ({
  ...theme.typography.readout,
  fontSize: emphasis ? theme.typography.readoutLarge.fontSize : theme.typography.body1.fontSize,
  lineHeight: theme.typography.readoutLarge.lineHeight,
  color: theme.palette.text.primary,
}));

export const Unit = styled('div')(({ theme }) => ({
  ...theme.typography.readout,
  fontSize: theme.typography.caption.fontSize,
  color: theme.palette.text.secondary,
}));
