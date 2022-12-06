import {
  Flex,
  Icon,
  Input,
} from '@tonic-ui/react';
import {
  callEventHandlers,
  isNullOrUndefined,
} from '@tonic-ui/utils';
import React from 'react';
import { Field } from 'react-final-form';

const defaultRender = ({
  input,
  isInvalid,
  name,
  onBlur: onBlurProp,
  onChange: onChangeProp,
  onFocus: onFocusProp,
  ...other
}) => (
  <Input
    {...input}
    isInvalid={isInvalid}
    name={name}
    onBlur={callEventHandlers(onBlurProp, input.onBlur)}
    onChange={callEventHandlers(onChangeProp, input.onChange)}
    onFocus={callEventHandlers(onFocusProp, input.onFocus)}
    {...other}
  />
);

const FieldInput = ({
  name,
  render = defaultRender,
  ...props
}) => (
  <Field name={name}>
    {({ input, meta }) => {
      const isInvalid = meta.touched && !isNullOrUndefined(meta.error);

      return (
        <Flex position="relative" align="center" width="100%">
          {render({ input, isInvalid, name, ...props })}
          {isInvalid && (
            <Flex position="absolute" right={0} align="center">
              <Icon icon="warning-circle" px="3x" color="red:50" />
            </Flex>
          )}
        </Flex>
      );
    }}
  </Field>
);

export default FieldInput;
