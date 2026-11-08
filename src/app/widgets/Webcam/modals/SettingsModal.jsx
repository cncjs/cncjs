import {
  Box,
  Button,
  Dropdown,
  DropdownButton,
  FormControl,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Radio,
  Text,
  TextLabel,
} from '@tonic-ui/react';
import { ensureArray } from 'ensure-type';
import React, { useEffect, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import i18n from '@app/lib/i18n';
import log from '@app/lib/log';
import useWidgetConfig from '@app/widgets/shared/useWidgetConfig';
import {
  MEDIA_SOURCE_LOCAL,
  MEDIA_SOURCE_STREAM,
} from '../constants';

function useVideoDevices() {
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    let active = true;
    const enumerateDevices = navigator.mediaDevices?.enumerateDevices;
    if (!enumerateDevices) {
      return undefined;
    }
    enumerateDevices.call(navigator.mediaDevices)
      .then(items => active && setDevices(ensureArray(items).filter(item => item.kind === 'videoinput')))
      .catch(error => log.error(`${error.name}: ${error.message}`));
    return () => {
      active = false;
    };
  }, []);

  return devices;
}

/**
 * @param {object} props
 * @param {Function} props.onClose
 */
function SettingsModal({ onClose }) {
  const config = useWidgetConfig();
  const devices = useVideoDevices();
  const initialValues = {
    mediaSource: config.get('mediaSource', MEDIA_SOURCE_LOCAL),
    deviceId: config.get('deviceId', '__default__'),
    url: config.get('url', ''),
  };
  const methods = useForm({ defaultValues: initialValues, mode: 'onSubmit' });
  const mediaSource = useWatch({ control: methods.control, name: 'mediaSource' });
  const submit = ({ mediaSource, deviceId, url }) => {
    config.set('mediaSource', mediaSource);
    config.set('deviceId', deviceId);
    config.set('url', url);
    onClose();
  };

  return (
    <Modal
      autoFocus closeOnEsc closeOnInteractOutside={false}
      ensureFocus isClosable isOpen
      size="sm" onClose={onClose}
    >
      <ModalOverlay />
      <FormProvider {...methods}>
        <ModalContent as="form" noValidate onSubmit={methods.handleSubmit(submit)}>
          <ModalHeader>{i18n._('Webcam Settings')}</ModalHeader>
          <ModalBody>
            <FormControl mb="4x">
              <TextLabel>{i18n._('Media Source')}</TextLabel>
              <Controller
                name="mediaSource" render={({ field }) => (
                  <Radio
                    {...field}
                    value={MEDIA_SOURCE_LOCAL}
                    checked={field.value === MEDIA_SOURCE_LOCAL}
                    onChange={() => field.onChange(MEDIA_SOURCE_LOCAL)}
                  >
                    {i18n._('Use a built-in camera or a connected webcam')}
                  </Radio>
                )}
              />
              <Box mt="2x" ml="5x">
                <Controller
                  name="deviceId" render={({ field: input }) => {
                    const isDisabled = mediaSource !== MEDIA_SOURCE_LOCAL;
                    const deviceOptions = [
                      { value: '__default__', label: i18n._('Automatic detection') },
                      ...devices.map(device => ({ value: device.deviceId, label: device.label || device.deviceId })),
                    ];
                    return (
                      <Dropdown
                        matchWidth
                        items={deviceOptions}
                        value={deviceOptions.find(option => option.value === input.value) || null}
                        renderItem={option => option?.label ?? ''}
                        renderToggle={({ renderItem, value: selected }) => (
                          <DropdownButton
                            aria-label={i18n._('Choose a video device')}
                            disabled={isDisabled}
                            width="100%"
                            variant="secondary"
                          >
                            {renderItem(selected)}
                          </DropdownButton>
                        )}
                        onChange={option => input.onChange(option?.value ?? null)}
                      />
                    );
                  }}
                />
              </Box>
            </FormControl>
            <FormControl>
              <Controller
                name="mediaSource" render={({ field }) => (
                  <Radio
                    {...field}
                    value={MEDIA_SOURCE_STREAM}
                    checked={field.value === MEDIA_SOURCE_STREAM}
                    onChange={() => field.onChange(MEDIA_SOURCE_STREAM)}
                  >
                    {i18n._('Connect to an IP camera')}
                  </Radio>
                )}
              />
              <Box mt="2x" ml="5x">
                <Input
                  {...methods.register('url')}
                  aria-label={i18n._('Stream URL')}
                  disabled={mediaSource !== MEDIA_SOURCE_STREAM}
                  placeholder="http://0.0.0.0:8080/?action=stream" type="url"
                />
                <Text color="text.secondary" fontSize="sm" mt="1x">{i18n._('The URL should point to a stream in one of the following formats: Motion JPEG (mjpeg), RTSP, or H264 (MP4).')}</Text>
              </Box>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose}>{i18n._('Cancel')}</Button>
            <Button variant="primary" type="submit">{i18n._('Save Changes')}</Button>
          </ModalFooter>
        </ModalContent>
      </FormProvider>
    </Modal>
  );
}

export default SettingsModal;
