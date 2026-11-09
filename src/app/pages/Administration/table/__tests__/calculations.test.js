import { getColumnSizing } from '../columnSizing';
import { getPageNumber } from '../pagination';

test('measured columns retain minimum widths and give remaining space to auto columns', () => {
  const columns = [
    { id: 'selection', size: 48, minSize: 48 },
    { id: 'name', size: 'auto', minSize: 80, header: 'Name' },
    { id: 'modified', size: 200, minSize: 80 },
  ];
  expect(getColumnSizing(columns, 600, () => 32)).toEqual({ selection: 48, name: 352, modified: 200 });
  expect(getColumnSizing(columns, 200, () => 32)).toEqual({ selection: 48, name: 80, modified: 200 });
  expect(columns[1].size).toBe('auto');
});

test('percentage columns honor measured header widths and fixed-only columns share spare space', () => {
  expect(getColumnSizing([{ id: 'name', size: '50%', minSize: 80, header: 'Name' }], 100, () => 100)).toEqual({ name: 124 });
  expect(getColumnSizing([{ id: 'one', size: 100 }, { id: 'two', size: 100 }], 300, () => 0)).toEqual({ one: 150, two: 150 });
});

test.each([[0, 6, 1], [99, 6, 6], [3, 6, 3], ['', 0, 1], ['bad', 6, 1], [2.5, 6, 2]])(
  'page input %s stays in the one-based range of %s pages', (value, count, expected) => {
    expect(getPageNumber(value, count)).toBe(expected);
  }
);
