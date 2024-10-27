import {
  Flex,
  Icon,
  Input,
  Text,
} from '@tonic-ui/react';
import { WarningCircleIcon } from '@tonic-ui/react-icons';
import {
  isNullOrUndefined,
} from '@tonic-ui/utils';
import React, { forwardRef } from 'react';
import { Field } from 'react-final-form';

const FieldInput = forwardRef((
  {
    name,
    validate,
    ...rest
  },
  ref,
) => (
  <Field name={name} validate={validate}>
    {({ input, meta }) => {
      const error = meta.submitFailed && !isNullOrUndefined(meta.error);

      return (
        <>
          <Flex
            position="relative"
            alignItems="center"
            width="100%"
          >
            <Input
              ref={ref}
              {...input}
              error={error}
              name={name}
              pr={error ? '10x' : undefined}
              {...rest}
            />
            {error && (
              <Flex
                position="absolute"
                right={0}
                top={0}
                alignItems="center"
                height="8x"
              >
                <Icon as={WarningCircleIcon} mx="3x" color="red:50" />
              </Flex>
            )}
          </Flex>
          {error && (
            <Text fontSize="sm" lineHeight="sm" color="red:50">
              {meta.error}
            </Text>
          )}
        </>
      );
    }}
  </Field>
));

export default FieldInput;
