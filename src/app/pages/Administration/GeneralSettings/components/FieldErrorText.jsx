import {
  Text,
  useColorMode,
  useColorStyle,
} from '@tonic-ui/react';
import {
  isNullOrUndefined,
} from '@tonic-ui/utils';
import React from 'react';
import { Field } from 'react-final-form';

const FieldErrorText = ({
  name,
  ...props
}) => {
  const [colorMode] = useColorMode();
  const [colorStyle] = useColorStyle({ colorMode });

  return (
    <Field
      name={name}
      subscription={{ error: true, touched: true }}
      render={({ meta }) => {
        const isEmpty = !meta.error;
        const isInvalid = meta.touched && !isNullOrUndefined(meta.error);
        const isValid = !isInvalid;

        if (isEmpty || isValid) {
          return null;
        }

        return (
          <Text color={colorStyle.color.error} mt="1x" {...props}>
            {meta.error}
          </Text>
        );
      }}
    />
  );
};

export default FieldErrorText;
