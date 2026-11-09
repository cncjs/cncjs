import {
  Text,
} from '@tonic-ui/react';
import {
  get,
  useFormState,
} from 'react-hook-form';
import React, { forwardRef } from 'react';
import i18n from '@app/lib/i18n';

/**
 * @param {object} props
 * @param {string} props.name
 */
const FieldErrorText = forwardRef((
  {
    name,
    ...rest
  },
  ref,
) => {
  const { errors } = useFormState({ name });
  const fieldError = get(errors, name);
  const error = fieldError && (fieldError.message || i18n._('Invalid value.'));

  if (!error) {
    return null;
  }

  return (
    <Text
      ref={ref}
      color="error.text"
      mt="1x"
      {...rest}
    >
      {error}
    </Text>
  );
});

export default FieldErrorText;
