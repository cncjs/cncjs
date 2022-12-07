import {
  Flex,
  Icon,
  Input,
} from '@tonic-ui/react';
import {
  isNullOrUndefined,
} from '@tonic-ui/utils';
import React, { forwardRef } from 'react';
import { Field } from 'react-final-form';

const FieldInput = forwardRef((
  {
    name,
    ...rest
  },
  ref,
) => (
  <Field name={name}>
    {({ input, meta }) => {
      const isInvalid = meta.touched && !isNullOrUndefined(meta.error);

      return (
        <Flex
          position="relative"
          align="center"
          width="100%"
        >
          <Input
            ref={ref}
            {...input}
            isInvalid={isInvalid}
            name={name}
            {...rest}
          />
          {isInvalid && (
            <Flex position="absolute" right={0} align="center">
              <Icon icon="warning-circle" px="3x" color="red:50" />
            </Flex>
          )}
        </Flex>
      );
    }}
  </Field>
));

export default FieldInput;
