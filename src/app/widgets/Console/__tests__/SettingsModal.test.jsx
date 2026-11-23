import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAppUI } from '@app/test/render';
import SettingsModal from '../SettingsModal';

jest.mock('@app/lib/i18n', () => ({ __esModule: true, default: { _: (text, values) => text.replace(/{{(\w+)}}/g, (_match, name) => values[name]) } }));
const values = { fontSize: 14, cols: 256, rows: 15, background: 'black', textColor: 'default' };

test('keeps the settings draft local on preview and cancel', async () => {
  const onSave = jest.fn();
  const onClose = jest.fn();
  renderAppUI(<SettingsModal values={values} onSave={onSave} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: 'Background color' }));
  await userEvent.click(screen.getByText('White', { exact: true }));
  expect(screen.getByLabelText('Terminal preview')).toHaveStyle({ backgroundColor: '#ffffff' });
  fireEvent.change(screen.getByRole('textbox', { name: 'Columns' }), { target: { value: '100' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onSave).not.toHaveBeenCalled();
  expect(onClose).toHaveBeenCalledTimes(1);
});

test.each(['', '79', '501', '80.5', '1e2', 'abc'])('rejects invalid columns %s and retains the modal', async cols => {
  const onSave = jest.fn();
  const onClose = jest.fn();
  renderAppUI(<SettingsModal values={values} onSave={onSave} onClose={onClose} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Columns' }), { target: { value: cols } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  expect(await screen.findByText('Enter a number between 80 and 500')).toBeVisible();
  expect(onSave).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});

test('saves validated numeric geometry through the keyboard', async () => {
  const user = userEvent.setup();
  const onSave = jest.fn();
  const onClose = jest.fn();
  renderAppUI(<SettingsModal values={values} onSave={onSave} onClose={onClose} />);
  const cols = screen.getByRole('textbox', { name: 'Columns' });
  await user.clear(cols);
  await user.type(cols, '80');
  const rows = screen.getByRole('textbox', { name: 'Rows' });
  await user.clear(rows);
  await user.type(rows, '100');
  screen.getByRole('button', { name: 'Save Changes' }).focus();
  await user.keyboard('{Enter}');
  await waitFor(() => expect(onSave).toHaveBeenCalledWith({ ...values, cols: 80, rows: 100 }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('shows a pending-input save error without closing', async () => {
  const onClose = jest.fn();
  renderAppUI(<SettingsModal values={values} onSave={() => 'Finish typing first'} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Finish typing first');
  expect(onClose).not.toHaveBeenCalled();
});
