import {
  Checkbox,
} from '@tonic-ui/react';
import {
  isNullOrUndefined,
} from '@tonic-ui/utils';
import React, { forwardRef } from 'react';
import { Field } from 'react-final-form';

const FieldCheckbox = forwardRef((
  {
    name,
    ...rest
  },
  ref,
) => (
  <Field type="checkbox" name={name}>
    {({ input, meta }) => {
      const isInvalid = meta.touched && !isNullOrUndefined(meta.error);

      return (
        <Checkbox
          ref={ref}
          {...input}
          isInvalid={isInvalid}
          name={name}
          {...rest}
        />
      );
    }}
  </Field>
));

export default FieldCheckbox;
