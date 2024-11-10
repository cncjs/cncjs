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
  Flex,
  LinkButton,
  Menu,
  MenuToggle,
  MenuList,
  MenuGroup,
  MenuItem,
  Spinner,
  Text,
} from '@tonic-ui/react';
import memoize from 'micro-memoize';
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
  useReadMacroQuery,
  useUpdateMacroMutation,
} from '../queries';
import {
  insertAtCaret,
} from '../utils';

const getMemoizedState = memoize(state => ({ ...state }));

const UpdateMacroDrawer = ({
  id,
  onClose,
  ...rest
}) => {
  const gcodeInputRef = useRef();
  const { toasts, notify: notifyToast } = useInlineToasts();
  const queryClient = useQueryClient();
  const readMacroQuery = useReadMacroQuery({
    meta: {
      id,
    },
  });
  const updateMacroMutation = useUpdateMacroMutation({
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
  const initialValues = getMemoizedState({
    name: readMacroQuery.data?.name,
    action: readMacroQuery.data?.action,
  });
  const handleFormSubmit = useCallback((values) => {
    updateMacroMutation.mutate({
      meta: {
        id,
      },
      data: values,
    });
  }, [updateMacroMutation, id]);
  const isFormDisabled = (readMacroQuery.isError || readMacroQuery.isFetching || updateMacroMutation.isLoading);

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
          errors.action = validations.required(values.action);
          return errors;
        }}
        render={({ form }) => (
          <DrawerContent>
            <InlineToastContainer>
              <InlineToasts toasts={toasts} />
            </InlineToastContainer>
            <DrawerHeader>
              <Text>
                {i18n._('Macro Details')}
              </Text>
            </DrawerHeader>
            <DrawerBody>
              {readMacroQuery.isFetching && (
                <Spinner />
              )}
              {!(readMacroQuery.isFetching) && (
                <>
                  <FormGroup>
                    <Box mb="1x">
                      <FieldTextLabel
                        required
                      >
                        {i18n._('Macro name:')}
                      </FieldTextLabel>
                    </Box>
                    <FieldInput name="name" />
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
                                    form.change('action', textareaValue);
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
                      name="action"
                      rows="10"
                    />
                  </FormGroup>
                </>
              )}
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
                  {i18n._('Save')}
                </Button>
              </Flex>
            </DrawerFooter>
          </DrawerContent>
        )}
      />
    </Drawer>
  );
};

export default UpdateMacroDrawer;
