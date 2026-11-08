import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormInput,
  FormLabel,
  FormTextarea,
  Dropdown,
  DropdownButton,
  MenuGroup,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Space,
  Text,
} from '@tonic-ui/react';
import { ensureArray } from 'ensure-type';
import React, { useEffect, useRef } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import i18n from '@app/lib/i18n';
import portal from '@app/lib/portal';
import {
  useDeleteMacroMutation,
  useUpdateMacroMutation,
} from '@app/queries/macros';
import { required } from '@app/widgets/shared/validations';
import variables from '../shared/variables';
import ConfirmDeleteMacro from './ConfirmDeleteMacro';

const mapMacroVariablesToMenuItems = variables => ensureArray(variables).flatMap((x) => {
  if (x.role === 'group') {
    return [
      {
        value: x.title,
        type: 'custom',
        content: (
          <MenuGroup title={x.title} />
        ),
      },
      ...mapMacroVariablesToMenuItems(x.children),
    ];
  }

  if (x.role === 'menuitem') {
    return [{ value: x.value, content: x.value, props: { px: '6x' } }];
  }

  return [];
});

/**
 * @param {object} props
 * @param {Function} props.onClose
 * @param {string} props.id
 * @param {string} props.name
 * @param {string} props.content
 */
function EditMacro({
  onClose,
  id,
  name,
  content,
}) {
  const contentRef = useRef();
  const submitLockRef = useRef(false);
  const updateMacroMutation = useUpdateMacroMutation();
  const deleteMacroMutation = useDeleteMacroMutation();
  const initialValues = {
    name,
    content,
  };
  const methods = useForm({ defaultValues: initialValues, mode: 'onSubmit' });
  const { register, reset, formState: { errors, isSubmitting, isSubmitted } } = methods;
  const contentField = register('content', { validate: required });
  useEffect(() => {
    reset({ name, content });
  }, [name, content, reset]);
  const insertAtCaret = (text) => {
    const textarea = contentRef.current;
    if (!textarea) {
      return;
    }
    const front = textarea.value.substring(0, textarea.selectionStart);
    const back = textarea.value.substring(textarea.selectionEnd);
    methods.setValue('content', front + text + back, { shouldDirty: true, shouldValidate: isSubmitted });
  };
  const submit = async (values) => {
    if (submitLockRef.current) {
      return;
    }
    submitLockRef.current = true;
    try {
      await updateMacroMutation.mutateAsync({
        meta: { id },
        data: { name: values.name, content: values.content },
      });
      onClose();
    } catch (error) {
      submitLockRef.current = false;
      methods.setError('root', {
        type: 'server',
        message: error.message || i18n._('An unexpected error has occurred.'),
      });
    }
  };
  const handleClose = () => {
    if (
      submitLockRef.current ||
      updateMacroMutation.isLoading ||
      deleteMacroMutation.isLoading
    ) {
      return;
    }
    onClose();
  };

  const handleClickDelete = () => {
    if (
      submitLockRef.current ||
      updateMacroMutation.isLoading ||
      deleteMacroMutation.isLoading
    ) {
      return;
    }
    const closeEdit = onClose;
    const onConfirm = async (closeConfirm) => {
      await deleteMacroMutation.mutateAsync({ meta: { id } });
      closeConfirm();
      closeEdit();
    };

    portal(({ onClose: closeConfirm }) => (
      // TODO
      <ConfirmDeleteMacro
        onClose={closeConfirm}
        name={name}
        onConfirm={() => onConfirm(closeConfirm)}
      />
    ));
  };

  return (
    <Modal
      isClosable
      isOpen
      onClose={handleClose}
      size="md"
    >
      <FormProvider {...methods}>
        <ModalOverlay />
        <ModalContent as="form" noValidate onSubmit={methods.handleSubmit(submit)}>
          <ModalHeader>
            {i18n._('Edit Macro')}
          </ModalHeader>
          <ModalBody>
            <FormControl error={Boolean(errors.name)} mb="4x">
              <FormLabel required>
                {i18n._('Macro Name')}
              </FormLabel>
              <FormInput {...register('name', { validate: required })} />
              <FormErrorMessage errors={errors.name ? [errors.name.message] : []} />
            </FormControl>
            <FormControl error={Boolean(errors.content)} mb="4x">
              <Flex align="center" justify="space-between">
                <Box>
                  <FormLabel required>
                    {i18n._('Macro Commands')}
                  </FormLabel>
                </Box>
                <Box>
                  <Dropdown
                    portalled
                    items={mapMacroVariablesToMenuItems(variables)}
                    onChange={item => insertAtCaret(item.value)}
                    renderItem={item => item?.content}
                    renderToggle={() => (
                      <DropdownButton variant="ghost">
                        <FontAwesomeIcon icon="plus" fixedWidth />
                        <Space width="2x" />
                        {i18n._('Macro Variables')}
                      </DropdownButton>
                    )}
                  />
                </Box>
              </Flex>
              <FormTextarea
                {...contentField}
                ref={(element) => {
                  contentField.ref(element);
                  contentRef.current = element;
                }}
                rows={8}
              />
              <FormErrorMessage errors={errors.content ? [errors.content.message] : []} />
            </FormControl>
          </ModalBody>
          <ModalFooter justify="space-between">
            {errors.root && (
              <Text color="error.text" mr="auto">
                {errors.root.message}
              </Text>
            )}
            <Box>
              <Button
                variant="emphasis"
                minWidth="20x"
                disabled={isSubmitting || updateMacroMutation.isLoading || deleteMacroMutation.isLoading}
                onClick={handleClickDelete}
              >
                {i18n._('Delete')}
              </Button>
            </Box>
            <Box>
              <Button
                variant="default"
                disabled={isSubmitting || updateMacroMutation.isLoading || deleteMacroMutation.isLoading}
                onClick={handleClose}
                minWidth="20x"
              >
                {i18n._('Cancel')}
              </Button>
              <Button
                variant="primary"
                disabled={isSubmitting || updateMacroMutation.isLoading}
                type="submit"
                minWidth="20x"
              >
                {i18n._('Save Changes')}
              </Button>
            </Box>
          </ModalFooter>
        </ModalContent>
      </FormProvider>
    </Modal>
  );
}

export default EditMacro;
