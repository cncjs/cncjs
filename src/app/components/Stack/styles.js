import { styled } from '@mui/material/styles';

/**
 * One vertical rhythm for the whole application.
 *
 * The gap is not a prop on purpose. A spacing value passed in from a screen is
 * a spacing decision made outside the theme, and two screens that each choose
 * their own are two screens that no longer look like one system.
 */
export const Root = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  minWidth: 0,
}));
