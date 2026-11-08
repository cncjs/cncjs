import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAppUI } from '@app/test/render';
import TableRecords from '../Settings/MDI/TableRecords';

jest.mock('@app/lib/i18n', () => ({ __esModule: true, default: { _: text => text } }));

const records = [
  { id: 'one', name: 'Home', command: 'G28', grid: { xs: 6 } },
  { id: 'two', name: 'Long command', command: 'G0 X1\nG0 X2\nG0 X3\nG0 X4\nG0 X5', grid: { xs: 12 } },
];

test('MDI table preserves ordering, movement bounds, record actions and command truncation', async () => {
  const user = userEvent.setup();
  const onMove = jest.fn();
  const onUpdate = jest.fn();
  const onRemove = jest.fn();
  const onCreate = jest.fn();
  const view = renderAppUI(<TableRecords
    records={records} onMove={onMove} onUpdate={onUpdate}
    onRemove={onRemove} onCreate={onCreate}
  />);
  try {
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent('Home');
    expect(rows[2]).toHaveTextContent('Long command');
    expect(within(rows[1]).getByRole('button', { name: 'Move Up' })).toBeDisabled();
    expect(within(rows[2]).getByRole('button', { name: 'Move Down' })).toBeDisabled();
    await user.click(within(rows[1]).getByRole('button', { name: 'Move Down' }));
    expect(onMove).toHaveBeenCalledWith(0, 1);
    await user.click(within(rows[2]).getByRole('button', { name: 'Update' }));
    expect(onUpdate).toHaveBeenCalledWith(records[1]);
    await user.click(within(rows[1]).getByRole('button', { name: 'Remove' }));
    expect(onRemove).toHaveBeenCalledWith('one');
    await user.click(screen.getByRole('button', { name: 'New' }));
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(rows[2]).toHaveTextContent('and more...');
    expect(rows[2]).not.toHaveTextContent('G0 X5');
  } finally {
    view.dispose();
  }
});

test.each([
  [{ loading: true }, 'Loading...'], [{ error: true }, 'An unexpected error has occurred.'], [{}, 'No data to display'],
])('MDI table shows the correct non-data state', (props, label) => {
  const view = renderAppUI(<TableRecords records={[]} {...props} />);
  try {
    expect(screen.getByText(label)).toBeInTheDocument();
  } finally {
    view.dispose();
  }
});
