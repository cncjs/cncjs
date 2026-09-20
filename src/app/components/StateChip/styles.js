import { styled } from '@mui/material/styles';

const toneOf = (theme, tone) => theme.tokens.machineState[tone] || theme.tokens.machineState.inactive;

/**
 * The machine state, as one object.
 *
 * Square, hairline, tinted, with the state word tracked and uppercase — the
 * same grammar as every other label in the panel, so it does not read as a
 * badge borrowed from somewhere else.
 */
export const Root = styled('span', {
  shouldForwardProp: (prop) => prop !== 'tone',
})(({ theme, tone }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(0.75, 1.5),
  backgroundColor: toneOf(theme, tone).tint,
  border: `${theme.tokens.border.hairline} solid ${toneOf(theme, tone).border}`,
}));

/**
 * The one round thing in a square design, and it is in the mockup.
 *
 * It carries the colour so the word does not have to be read to know the
 * state, which is the whole point of a chip on a machine panel: the answer
 * arrives from across the room, before the word does.
 */
export const Dot = styled('span', {
  shouldForwardProp: (prop) => prop !== 'tone',
})(({ theme, tone }) => ({
  width: 10,
  height: 10,
  flex: 'none',
  borderRadius: '50%',
  backgroundColor: toneOf(theme, tone).dot,
}));

export const Label = styled('span', {
  shouldForwardProp: (prop) => prop !== 'tone',
})(({ theme, tone }) => ({
  ...theme.typography.overline,
  color: toneOf(theme, tone).text,
}));
