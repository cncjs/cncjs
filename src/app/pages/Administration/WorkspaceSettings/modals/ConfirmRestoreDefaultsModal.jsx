import {
  Box,
  Button,
  Code,
  Flex,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  Stack,
  Text,
} from '@tonic-ui/react';
import ModalWarningIcon from '@app/icons/ModalWarningIcon';
import _get from 'lodash/get';
import React from 'react';
import i18n from '@app/lib/i18n';
import { useSystemInformationQuery } from '../queries';

const ConfirmRestoreDefaultsModal = ({
  onClose,
  onConfirm,
  ...rest
}) => {
  const systemInformationQuery = useSystemInformationQuery();
  const configFile = _get(systemInformationQuery.data, 'userStore.file');

  return (
    <Modal
      closeOnEsc
      closeOnInteractOutside
      isClosable
      isOpen={true}
      onClose={onClose}
      {...rest}
    >
      <ModalContent>
        <ModalBody>
          <Flex columnGap="4x">
            <ModalWarningIcon
              color="warning.icon"
              size="12x"
            />
            <Stack spacing="1x">
              <Text fontWeight="semibold">{i18n._('Warning')}</Text>
              <Text>{i18n._('Are you sure you want to restore the default settings?')}</Text>
              <Box>
                {configFile && (
                  <Code>{configFile}</Code>
                )}
              </Box>
            </Stack>
          </Flex>
        </ModalBody>
        <ModalFooter columnGap="2x">
          <Button
            variant="primary"
            onClick={onConfirm}
            sx={{
              minWidth: 80,
            }}
          >
            {i18n._('Restore Defaults')}
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

export default ConfirmRestoreDefaultsModal;
