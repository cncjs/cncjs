import { styled } from '@mui/material/styles';

export const Track = styled('div')(({ theme }) => ({
  height: theme.spacing(1),
  backgroundColor: theme.tokens.color.borderSubtle,
  border: `${theme.tokens.border.hairline} solid ${theme.tokens.color.border}`,
}));

/**
 * The fill is the colour of a machine that is running, not the accent.
 *
 * On this panel the accent means "you can act on this". A job in progress is
 * a state, not a control, and it shares its colour with every other running
 * indicator so that one glance across the panel answers one question.
 */
export const Fill = styled('div', {
  shouldForwardProp: (prop) => prop !== 'percent',
})(({ theme, percent }) => ({
  width: `${percent}%`,
  height: '100%',
  backgroundColor: theme.palette.success.main,
}));
