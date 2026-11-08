import { formatISODateTime } from '../GCodeStats';

describe('GCodeStats date formatting', () => {
  test('formats a positive timestamp with date-fns v4 tokens', () => {
    expect(formatISODateTime(new Date(2025, 0, 2, 3, 4, 5).getTime())).toBe(
      '2025-01-02 03:04:05'
    );
  });
});
