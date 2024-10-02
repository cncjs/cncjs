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

const ConfirmBulkDeleteRecordsModal = ({
  data,
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
          <Flex columnGap="4x" mb="6x">
            <Icon
              icon=":modal-info"
              color={colorStyle?.color?.info}
              size="12x"
            />
            <Stack spacing="1x">
              <Text>{i18n._('Are you sure you want to delete the selected items?')}</Text>
              <Text>{i18n._('Count: {{count}}', { count: data.length })}</Text>
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
            {i18n._('Delete')}
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

export default ConfirmBulkDeleteRecordsModal;
