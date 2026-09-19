import ScopedCssBaseline from '@mui/material/ScopedCssBaseline';
import { styled } from '@mui/material/styles';

/**
 * The migrated subtree's own baseline.
 *
 * `ScopedCssBaseline` is what makes a screen-by-screen migration possible: it
 * applies the reset and the surface colour to this element and its children
 * only, so every screen still on bootstrap keeps rendering exactly as it did.
 */
export const Surface = styled(ScopedCssBaseline)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start',
  padding: theme.spacing(7, 2),
}));

export const Column = styled('div')(({ theme }) => ({
  width: '100%',
  maxWidth: theme.tokens.size.column,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));
