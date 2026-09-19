import { styled } from '@mui/material/styles';

/**
 * A quiet block of secondary readings.
 *
 * Monospace, small, tight line rhythm, no uppercase labels — everything the
 * panel needs to be able to say but nothing it is about. Giving each of these
 * a tracked uppercase label and a full line of its own is what turns a panel
 * into a form.
 */
export const Root = styled('dl')(({ theme }) => ({
  ...theme.typography.readout,
  margin: 0,
  // Regular weight, unlike a headline reading: these are there to be found
  // when looked for, not to be read from across the room.
  fontWeight: theme.typography.fontWeightRegular,
  fontSize: theme.typography.caption.fontSize,
  lineHeight: theme.tokens.lineHeight.detail,
}));

export const Row = styled('div')({
  display: 'flex',
  alignItems: 'baseline',
  gap: '1ch',
});

export const Label = styled('dt')(({ theme }) => ({
  margin: 0,
  color: theme.palette.text.secondary,
}));

export const Value = styled('dd')(({ theme }) => ({
  margin: 0,
  marginLeft: 'auto',
  color: theme.palette.text.primary,
}));
