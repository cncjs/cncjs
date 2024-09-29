import {
  Button,
  Flex,
  Icon,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  Stack,
  Text,
  useColorStyle,
} from '@tonic-ui/react';
import CodePreview from '@app/components/CodePreview';
import _set from 'lodash/set';
import React from 'react';
import i18n from '@app/lib/i18n';

const ConfirmImportWorkspaceSettingsModal = ({
  data: dataProp,
  onClose,
  onConfirm,
  ...rest
}) => {
  const [colorStyle] = useColorStyle();
  const data = JSON.parse(JSON.stringify(dataProp));
  _set(data, 'state.session.token', '********'); // Hide session token

  return (
    <Modal
      closeOnEsc
      closeOnOutsideClick
      isClosable
      isOpen={true}
      onClose={onClose}
      size="md"
      {...rest}
    >
      <ModalContent>
        <ModalBody>
          <Flex columnGap="4x" mb="6x">
            <Icon
              icon=":modal-warning"
              color={colorStyle.severity.medium}
              size="12x"
            />
            <Stack spacing="1x">
              <Text fontWeight="semibold">{i18n._('Warning')}</Text>
              <Text>{i18n._('Are you sure you want to overwrite the workspace settings?')}</Text>
            </Stack>
          </Flex>
          <CodePreview
            language="json"
            data={JSON.stringify(data, null, 2)}
            showLineNumbers
            wrapLongLines
            style={{
              width: '100%',
              maxHeight: 240,
            }}
          />
        </ModalBody>
        <ModalFooter columnGap="2x">
          <Button
            variant="primary"
            onClick={onConfirm}
            sx={{
              minWidth: 80,
            }}
          >
            {i18n._('Import')}
          </Button>
          <Button
            onClick={onClose}
            sx={{
              minWidth: 80,
            }}
          >
            {i18n._('Cancel')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ConfirmImportWorkspaceSettingsModal;
