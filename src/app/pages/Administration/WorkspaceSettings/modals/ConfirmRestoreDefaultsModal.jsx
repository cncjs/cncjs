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
import React from 'react';
import i18n from '@app/lib/i18n';

const ConfirmRestoreDefaultsModal = ({
  onClose,
  onConfirm,
  ...rest
}) => {
  const [colorStyle] = useColorStyle();

  return (
    <Modal
      closeOnEsc
      closeOnOutsideClick
      isClosable
      isOpen={true}
      onClose={onClose}
      {...rest}
    >
      <ModalContent>
        <ModalBody>
          <Flex columnGap="4x">
            <Icon
              icon=":modal-warning"
              color={colorStyle.severity.medium}
              size="12x"
            />
            <Stack spacing="1x">
              <Text fontWeight="semibold">{i18n._('Warning')}</Text>
              <Text>{i18n._('Are you sure you want to restore the default settings?')}</Text>
            </Stack>
          </Flex>
        </ModalBody>
        <ModalFooter columnGap="2x">
          <Button
            variant="secondary"
            onClick={onClose}
          >
            {i18n._('Cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
          >
            {i18n._('Restore Defaults')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ConfirmRestoreDefaultsModal;
