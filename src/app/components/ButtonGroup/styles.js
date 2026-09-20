import { styled } from '@mui/material/styles';

/**
 * Controls that do one job between them, drawn as one object.
 *
 * The mockup sets these solid and separates them with a single hairline rather
 * than with space: the gap is the group's own background showing through a
 * 1px flex gap. Space between them would say they are unrelated, and on a
 * panel where every other control is separated by space that reads wrong.
 *
 * Each child stretches to an equal share, so a row of five adjustments does
 * not have one wide button because its label happens to be longer.
 */
export const Root = styled('div')(({ theme }) => ({
  display: 'flex',
  gap: theme.tokens.border.hairline,
  backgroundColor: theme.tokens.color.border,
  border: `${theme.tokens.border.hairline} solid ${theme.tokens.color.border}`,
  '& > *': {
    flex: 1,
    minWidth: 0,
  },
}));
