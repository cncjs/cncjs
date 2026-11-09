import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { renderAppUI } from '@app/test/render';
import FieldInput from '../FieldInput';
import FieldTextarea from '../FieldTextarea';

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: { _: value => value },
}));

/** @param {{ Field: React.ComponentType, onSubmit: Function }} props */
function ValidationForm({ Field, onSubmit }) {
  const form = useForm({ mode: 'onSubmit', defaultValues: { value: '' } });
  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <Field name="value" label="Value" validate={value => value === 'ok'} />
        <button type="submit">Save</button>
      </form>
    </FormProvider>
  );
}

test.each([FieldInput, FieldTextarea])('shows a message-less validation failure and clears it after correction', async (Field) => {
  const submit = jest.fn();
  const view = renderAppUI(<ValidationForm Field={Field} onSubmit={submit} />);
  try {
    const input = screen.getByRole('textbox', { name: 'Value' });
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByText('Invalid value.')).toBeVisible();
    expect(submit).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'ok' } });
    await waitFor(() => expect(input).not.toHaveAttribute('aria-invalid', 'true'));
    expect(screen.queryByText('Invalid value.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith({ value: 'ok' }, expect.anything()));
  } finally {
    view.dispose();
  }
});
