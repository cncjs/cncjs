import { styled } from '@mui/material/styles';

/**
 * Two readings side by side, because a machine panel is read at a glance and a
 * single column of them scrolls out of sight.
 *
 * The count is fixed rather than a prop. Panels that each pick their own
 * column count stop looking like one instrument, and on the widths this runs
 * at — a workspace column, a tile — anything past two stops being legible.
 */
export const Root = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: theme.spacing(1.5),
}));
