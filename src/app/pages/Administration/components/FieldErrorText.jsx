import {
  Text,
  useColorMode,
  useColorStyle,
} from '@tonic-ui/react';
import {
  isNullOrUndefined,
} from '@tonic-ui/utils';
import React, { forwardRef } from 'react';
import { Field } from 'react-final-form';

const FieldErrorText = forwardRef((
  {
    name,
    ...rest
  },
  ref,
) => {
  const [colorMode] = useColorMode();
  const [colorStyle] = useColorStyle({ colorMode });

  return (
    <Field
      name={name}
      subscription={{
        error: true,
        touched: true,
      }}
      render={({ meta }) => {
        const isEmpty = !meta.error;
        const isInvalid = meta.touched && !isNullOrUndefined(meta.error);
        const isValid = !isInvalid;

        if (isEmpty || isValid) {
          return null;
        }

        return (
          <Text
            ref={ref}
            color={colorStyle.color.error}
            mt="1x"
            {...rest}
          >
            {meta.error}
          </Text>
        );
      }}
    />
  );
});

export default FieldErrorText;
