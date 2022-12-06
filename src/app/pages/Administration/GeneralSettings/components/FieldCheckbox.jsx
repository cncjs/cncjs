import {
  Checkbox,
} from '@tonic-ui/react';
import {
  isNullOrUndefined,
} from '@tonic-ui/utils';
import React from 'react';
import { Field } from 'react-final-form';

const FieldCheckbox = ({ name, ...props }) => (
  <Field type="checkbox" name={name}>
    {({ input, meta }) => {
      const isInvalid = meta.touched && !isNullOrUndefined(meta.error);

      return (
        <Checkbox
          {...input}
          isInvalid={isInvalid}
          name={name}
          {...props}
        />
      );
    }}
  </Field>
);

export default FieldCheckbox;
