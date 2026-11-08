import React from 'react';
import {
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAppUI } from '@app/test/render';

const mockUseCreateMacroMutation = jest.fn();
const mockUseUpdateMacroMutation = jest.fn();
const mockUseDeleteMacroMutation = jest.fn();
const mockPortal = jest.fn();

jest.mock('@app/queries/macros', () => ({
  __esModule: true,
  useCreateMacroMutation: (...args) => mockUseCreateMacroMutation(...args),
  useUpdateMacroMutation: (...args) => mockUseUpdateMacroMutation(...args),
  useDeleteMacroMutation: (...args) => mockUseDeleteMacroMutation(...args),
}));

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: { _: text => text },
}));

jest.mock('@app/lib/portal', () => ({
  __esModule: true,
  default: (...args) => mockPortal(...args),
}));

const NewMacro = require('../modals/NewMacro').default;
const EditMacro = require('../modals/EditMacro').default;

const getFormFields = () => screen.getAllByRole('textbox');

describe('Macro mutation modal contracts', () => {
  beforeEach(() => {
    mockUseCreateMacroMutation.mockReset();
    mockUseUpdateMacroMutation.mockReset();
    mockUseDeleteMacroMutation.mockReset();
    mockPortal.mockReset();
  });

  test.each([
    ['New', NewMacro, { onClose: jest.fn() }, mockUseCreateMacroMutation],
    ['Edit', EditMacro, { id: 'm1', name: '', content: '', onClose: jest.fn() }, mockUseUpdateMacroMutation],
  ])('%s Macro links required errors and blocks invalid keyboard submission', async (title, Component, props, mutationHook) => {
    const user = userEvent.setup();
    const mutateAsync = jest.fn();
    mutationHook.mockReturnValue({ isLoading: false, mutateAsync });
    if (title === 'Edit') {
      mockUseDeleteMacroMutation.mockReturnValue({ isLoading: false, mutateAsync: jest.fn() });
    }

    renderAppUI(<Component {...props} />);
    const name = screen.getByRole('textbox', { name: /^Macro Name/ });
    const content = screen.getByRole('textbox', { name: /^Macro Commands/ });
    const submit = screen.getByRole('button', { name: title === 'New' ? 'OK' : 'Save Changes' });
    submit.focus();
    await user.keyboard('{Enter}');

    await waitFor(() => expect(name).toHaveAttribute('aria-invalid', 'true'));
    expect(content).toHaveAttribute('aria-invalid', 'true');
    expect(name.getAttribute('aria-describedby')).toBeTruthy();
    expect(content.getAttribute('aria-describedby')).toBeTruthy();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  test.each([
    ['New', NewMacro, { onClose: jest.fn() }, mockUseCreateMacroMutation],
    ['Edit', EditMacro, { id: 'm1', name: '', content: '', onClose: jest.fn() }, mockUseUpdateMacroMutation],
  ])('%s Macro inserts a chosen variable in place of the command selection', async (title, Component, props, mutationHook) => {
    const user = userEvent.setup();
    mutationHook.mockReturnValue({ isLoading: false, mutateAsync: jest.fn() });
    if (title === 'Edit') {
      mockUseDeleteMacroMutation.mockReturnValue({ isLoading: false, mutateAsync: jest.fn() });
    }
    renderAppUI(<Component {...props} />);
    const content = screen.getByRole('textbox', { name: /^Macro Commands/ });
    fireEvent.change(content, { target: { value: 'G0 X1' } });
    content.setSelectionRange(3, 5);
    await user.click(screen.getByRole('button', { name: 'Macro Variables' }));
    const option = screen.getByRole('menuitem', { name: '%wait' });
    if (title === 'Edit') {
      option.focus();
      await user.keyboard('{Enter}');
    } else {
      await user.click(option);
    }
    expect(content).toHaveValue('G0 %wait\n');
  });

  test('NewMacro waits for create success before closing', async () => {
    let resolveCreate;
    const mutateAsync = jest.fn(() => new Promise(resolve => {
      resolveCreate = resolve;
    }));
    const onClose = jest.fn();
    mockUseCreateMacroMutation.mockReturnValue({
      isLoading: false,
      mutateAsync,
    });

    renderAppUI(<NewMacro onClose={onClose} />);
    const [name, content] = getFormFields();
    fireEvent.change(name, { target: { value: 'Fixture Macro' } });
    fireEvent.change(content, { target: { value: 'G0 X1' } });
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
      data: { name: 'Fixture Macro', content: 'G0 X1' },
    }));
    expect(onClose).not.toHaveBeenCalled();

    resolveCreate({ id: 'm1' });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  test('NewMacro keeps the draft after create failure', async () => {
    const mutateAsync = jest.fn().mockRejectedValue(new Error('save failed'));
    const onClose = jest.fn();
    mockUseCreateMacroMutation.mockReturnValue({
      isLoading: false,
      mutateAsync,
    });

    renderAppUI(<NewMacro onClose={onClose} />);
    const [name, content] = getFormFields();
    fireEvent.change(name, { target: { value: 'Fixture Macro' } });
    fireEvent.change(content, { target: { value: 'G0 X1' } });
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    expect(await screen.findByText('save failed')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('Fixture Macro')).toBeInTheDocument();
    expect(screen.getByDisplayValue('G0 X1')).toBeInTheDocument();
  });

  test('NewMacro does not submit twice before the pending state renders', async () => {
    const mutateAsync = jest.fn(() => new Promise(() => {}));
    mockUseCreateMacroMutation.mockReturnValue({
      isLoading: false,
      mutateAsync,
    });

    renderAppUI(<NewMacro onClose={jest.fn()} />);
    const [name, content] = getFormFields();
    fireEvent.change(name, { target: { value: 'Fixture Macro' } });
    fireEvent.change(content, { target: { value: 'G0 X1' } });
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
  });

  test('Edit delete keeps both dialogs open after failure', async () => {
    const onClose = jest.fn();
    const closeConfirm = jest.fn();
    const deleteMutation = jest.fn().mockRejectedValue(new Error('delete failed'));
    mockUseUpdateMacroMutation.mockReturnValue({ isLoading: false, mutateAsync: jest.fn() });
    mockUseDeleteMacroMutation.mockReturnValue({
      isLoading: false,
      mutateAsync: deleteMutation,
    });

    renderAppUI(
      <EditMacro
        id="m1"
        name="Fixture Macro"
        content="G0 X1"
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const confirm = mockPortal.mock.calls[0][0]({ onClose: closeConfirm });
    renderAppUI(confirm);

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);

    expect(await screen.findByText('delete failed')).toBeInTheDocument();
    expect(deleteMutation).toHaveBeenCalledWith({ meta: { id: 'm1' } });
    expect(closeConfirm).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  test('Edit delete closes confirm before the edit modal after success', async () => {
    const onClose = jest.fn();
    const closeConfirm = jest.fn();
    const deleteMutation = jest.fn().mockResolvedValue({});
    mockUseUpdateMacroMutation.mockReturnValue({ isLoading: false, mutateAsync: jest.fn() });
    mockUseDeleteMacroMutation.mockReturnValue({
      isLoading: false,
      mutateAsync: deleteMutation,
    });

    renderAppUI(
      <EditMacro
        id="m1"
        name="Fixture Macro"
        content="G0 X1"
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const confirm = mockPortal.mock.calls[0][0]({ onClose: closeConfirm });
    renderAppUI(confirm);
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(closeConfirm).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    expect(deleteMutation).toHaveBeenCalledWith({ meta: { id: 'm1' } });
  });
});
