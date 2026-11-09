import {
  Flex,
  FormControl,
  FormErrorMessage,
  FormInput,
  FormLabel,
  Icon,
} from '@tonic-ui/react';
import { WarningCircleIcon } from '@tonic-ui/react-icons';
import {
  get,
  useFormContext,
  useFormState,
} from 'react-hook-form';
import {
  useMergeRefs,
} from '@tonic-ui/react-hooks';
import React, { forwardRef } from 'react';
import i18n from '@app/lib/i18n';
import FieldTextLabel from './FieldTextLabel';

/**
 * @param {object} props
 * @param {string} props.name
 * @param {Function} [props.validate]
 * @param {string|string[]} [props.deps] - Fields to revalidate when this field changes.
 * @param {React.ReactNode} [props.label]
 * @param {boolean} [props.required]
 * @param {React.ReactNode} [props.infoTipLabel]
 * @param {React.ReactNode} [props.labelAction]
 */
const FieldInput = forwardRef((
  {
    name,
    validate,
    deps,
    label,
    required = false,
    infoTipLabel,
    labelAction,
    ...rest
  },
  ref,
) => {
  const { register } = useFormContext();
  const { errors } = useFormState({ name });
  const fieldError = get(errors, name);
  const error = fieldError && (fieldError.message || i18n._('Invalid value.'));

  const rules = { deps };

  if (validate) {
    rules.validate = validate;
  } else if (required) {
    rules.required = i18n._('This field is required.');
  }

  const registerProps = register(name, rules);
  const mergedRef = useMergeRefs(ref, registerProps.ref);
  return (
    <FormControl
      error={!!error}
      mb="4x"
    >
      {label && (
        <Flex
          alignItems="center"
          justifyContent="space-between"
        >
          <Flex alignItems="center">
            <FormLabel required={required}>{label}</FormLabel>
            {infoTipLabel && <FieldTextLabel infoTipLabel={infoTipLabel} />}
          </Flex>
          {labelAction}
        </Flex>
      )}
      <Flex
        position="relative"
        alignItems="center"
        width="100%"
      >
        <FormInput
          {...registerProps}
          ref={mergedRef}
          name={name}
          aria-required={required || undefined}
          aria-invalid={!!error || undefined}
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
            <Icon as={WarningCircleIcon} mx="3x" color="error.icon" />
          </Flex>
        )}
      </Flex>
      <FormErrorMessage errors={error ? [error] : []} />
    </FormControl>
  );
});

export default FieldInput;
