import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  DrawerOverlay,
  LinkButton,
  Menu,
  MenuToggle,
  MenuList,
  MenuGroup,
  MenuItem,
  Flex,
  Text,
} from '@tonic-ui/react';
import {
  useConst,
} from '@tonic-ui/react-hooks';
import React, { useCallback, useRef } from 'react';
import { Form } from 'react-final-form';
import FormGroup from '@app/components/FormGroup';
import {
  InlineToastContainer,
  InlineToasts,
  useInlineToasts,
} from '@app/components/InlineToasts';
import i18n from '@app/lib/i18n';
import FieldInput from '@app/pages/Administration/components/FieldInput';
import FieldTextarea from '@app/pages/Administration/components/FieldTextarea';
import FieldTextLabel from '@app/pages/Administration/components/FieldTextLabel';
import * as validations from '@app/pages/Administration/validations';
import {
  MACRO_VARIABLE_EXAMPLES,
} from '../constants';
import {
  API_MACROS_QUERY_KEY,
  useCreateMacroMutation,
} from '../queries';
import {
  insertAtCaret,
} from '../utils';

const CreateMacroDrawer = ({
  onClose,
  ...rest
}) => {
  const gcodeInputRef = useRef();
  const { toasts, notify: notifyToast } = useInlineToasts();
  const queryClient = useQueryClient();
  const createMacroMutation = useCreateMacroMutation({
    onSuccess: () => {
      if (typeof onClose === 'function') {
        onClose();
      }

      // Invalidate `useFetchMacrosQuery`
      queryClient.invalidateQueries({ queryKey: API_MACROS_QUERY_KEY });
    },
    onError: () => {
      notifyToast({
        appearance: 'error',
        content: (
          <Text>{i18n._('An unexpected error has occurred.')}</Text>
        ),
        duration: undefined,
      });
    },
  });
  const initialValues = useConst(() => ({
    name: '',
    data: '',
  }));
  const handleFormSubmit = useCallback((values) => {
    createMacroMutation.mutate({
      data: values,
    });
  }, [createMacroMutation]);
  const isFormDisabled = createMacroMutation.isLoading;

  return (
    <Drawer
      backdrop
      closeOnEsc
      isClosable
      isOpen={true}
      onClose={onClose}
      size="md"
      {...rest}
    >
      <DrawerOverlay />
      <Form
        initialValues={initialValues}
        onSubmit={handleFormSubmit}
        validate={(values) => {
          const errors = {};
          errors.name = validations.required(values.name);
          errors.data = validations.required(values.data);
          return errors;
        }}
        render={({ form }) => (
          <DrawerContent>
            <InlineToastContainer>
              <InlineToasts toasts={toasts} />
            </InlineToastContainer>
            <DrawerHeader>
              <Text>
                {i18n._('New Macro')}
              </Text>
            </DrawerHeader>
            <DrawerBody>
              <FormGroup>
                <Box mb="1x">
                  <FieldTextLabel
                    required
                  >
                    {i18n._('Macro name:')}
                  </FieldTextLabel>
                </Box>
                <FieldInput
                  name="name"
                />
              </FormGroup>
              <FormGroup>
                <Flex
                  mb="1x"
                  justifyContent="space-between"
                >
                  <FieldTextLabel
                    required
                    infoTipLabel={i18n._('Input the G-code commands to execute with this macro.')}
                  >
                    {i18n._('G-code commands:')}
                  </FieldTextLabel>
                  <Menu
                    placement="bottom-end"
                  >
                    <MenuToggle>
                      <LinkButton>
                        {i18n._('Select variables')}
                      </LinkButton>
                    </MenuToggle>
                    <MenuList
                      maxHeight="50vh"
                      overflow="auto"
                    >
                      {MACRO_VARIABLE_EXAMPLES.map(group => (
                        <MenuGroup
                          key={group.title}
                          title={group.title}
                        >
                          {group.data.map(item => (
                            <MenuItem
                              key={item}
                              value={item}
                              onClick={(event) => {
                                const el = gcodeInputRef.current;
                                const value = event.currentTarget.value;
                                const textareaValue = insertAtCaret(el, value);
                                form.change('data', textareaValue);
                              }}
                            >
                              {item}
                            </MenuItem>
                          ))}
                        </MenuGroup>
                      ))}
                    </MenuList>
                  </Menu>
                </Flex>
                <FieldTextarea
                  ref={gcodeInputRef}
                  name="data"
                  rows="10"
                />
              </FormGroup>
            </DrawerBody>
            <DrawerFooter>
              <Flex
                alignItems="center"
                columnGap="2x"
              >
                <Button
                  onClick={onClose}
                  sx={{
                    minWidth: 80,
                  }}
                >
                  {i18n._('Cancel')}
                </Button>
                <Button
                  variant="primary"
                  disabled={isFormDisabled}
                  onClick={() => {
                    form.submit();
                  }}
                  sx={{
                    minWidth: 80,
                  }}
                >
                  {i18n._('Add')}
                </Button>
              </Flex>
            </DrawerFooter>
          </DrawerContent>
        )}
      />
    </Drawer>
  );
};

export default CreateMacroDrawer;
