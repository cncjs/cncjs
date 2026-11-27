import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderAppUI } from '@app/test/render';
import CommandInput from '../CommandInput';

jest.mock('@app/lib/i18n', () => ({ __esModule: true, default: { _: text => text } }));

test('submits one trimmed command, clears the field, and ignores blank or composing input', async () => {
  const onSend = jest.fn();
  renderAppUI(<CommandInput onSend={onSend} />);
  const input = screen.getByRole('textbox', { name: 'Command' });
  const send = screen.getByRole('button', { name: 'Send' });
  expect(send).toBeDisabled();
  fireEvent.change(input, { target: { value: '   ' } });
  await act(() => Promise.resolve(fireEvent.keyDown(input, { key: 'Enter' })));
  expect(onSend).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: ' G0 X-10 ' } });
  fireEvent.compositionStart(input);
  await act(() => Promise.resolve(fireEvent.keyDown(input, { key: 'Enter' })));
  expect(onSend).not.toHaveBeenCalled();
  fireEvent.compositionEnd(input);
  fireEvent.click(send);
  await waitFor(() => expect(onSend).toHaveBeenCalledTimes(1));
  expect(onSend).toHaveBeenCalledWith('G0 X-10');
  expect(input).toHaveValue('');
  expect(send).toBeDisabled();
  expect(input).toHaveAttribute('autocapitalize', 'off');
  expect(input).toHaveAttribute('enterkeyhint', 'send');
});
