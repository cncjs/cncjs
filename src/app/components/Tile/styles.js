import { styled } from '@mui/material/styles';

export const Root = styled('section')(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  border: `${theme.tokens.border.hairline} solid ${theme.tokens.color.border}`,
}));

/**
 * The header bar is the tile's identity: a strip in a different tone, one
 * hairline below it, and an uppercase label with tracking. Every tile in the
 * panel is the same object seen from a different distance.
 */
export const Header = styled('header')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1.25, 1.5),
  backgroundColor: theme.tokens.color.panelHeader,
  borderBottom: `${theme.tokens.border.hairline} solid ${theme.tokens.color.border}`,
}));

export const Title = styled('h2')(({ theme }) => ({
  ...theme.typography.overline,
  margin: 0,
  color: theme.palette.text.primary,
}));

export const Body = styled('div')(({ theme }) => ({
  padding: theme.spacing(2),
}));
