import { styled } from '@mui/material/styles';

export const Table = styled('table')(({ theme }) => ({
  width: '100%',
  borderCollapse: 'collapse',
  border: `${theme.tokens.border.hairline} solid ${theme.tokens.color.border}`,
}));

export const HeaderCell = styled('th', {
  shouldForwardProp: (prop) => prop !== 'align',
})(({ theme, align }) => ({
  ...theme.typography.overline,
  padding: theme.spacing(0.75, 1),
  textAlign: align || 'left',
  color: theme.palette.text.secondary,
  backgroundColor: theme.tokens.color.panelHeader,
  borderBottom: `${theme.tokens.border.hairline} solid ${theme.tokens.color.border}`,
}));

/**
 * Every figure in a table is a machine reading, so the whole body is
 * monospace with tabular figures — that is what makes a column of numbers
 * line up on its decimal point without anyone aligning anything.
 */
export const Cell = styled('td', {
  shouldForwardProp: (prop) => prop !== 'align',
})(({ theme, align }) => ({
  ...theme.typography.readout,
  fontSize: theme.typography.body1.fontSize,
  padding: theme.spacing(0.75, 1),
  // Figures align right so a column of them lines up on its last digit; the
  // label column that names the row does not.
  textAlign: align || 'left',
  borderTop: `${theme.tokens.border.hairline} solid ${theme.tokens.color.borderSubtle}`,
}));
