import { styled } from '@mui/material/styles';
import { Root as BaseSurface } from '../Surface/styles';

// The baseline itself lives in `Surface`, which every migrated subtree starts
// at. A screen is that plus the page it sits on.
export const Surface = styled(BaseSurface)(({ theme }) => ({
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
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
