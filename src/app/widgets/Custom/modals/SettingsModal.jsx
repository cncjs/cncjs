import {
  TextLabel,
} from '@trendmicro/react-styled-ui';
import React from 'react';
import { Form, Field, FormSpy } from 'react-final-form';
import { Button } from 'app/components/Buttons';
import Input from 'app/components/FormControl/Input';
import FormGroup from 'app/components/FormGroup';
import InlineError from 'app/components/InlineError';
import Modal from 'app/components/Modal';
import useWidgetConfig from 'app/widgets/shared/useWidgetConfig';
import i18n from 'app/lib/i18n';

const SettingsModal = ({
  onClose,
}) => {
  const config = useWidgetConfig();
  const initialValues = {
    title: config.get('title'),
    url: config.get('url'),
  };

  return (
    <Modal
      disableOverlayClick
      size="sm"
      onClose={onClose}
    >
      <Form
        initialValues={initialValues}
        onSubmit={(values) => {
          const { title, url } = values;
          config.set('title', title);
          config.set('url', url);
          onClose();
        }}
        subscription={{}}
      >
        {({ form }) => {
          const handleSubmit = () => {
            form.submit();
          };

          return (
            <>
              <Modal.Header>
                <Modal.Title>{i18n._('Settings')}</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Field name="title">
                  {({ input, meta }) => (
                    <FormGroup>
                      <TextLabel mb="2x">
                        {i18n._('Title')}
                      </TextLabel>
                      <Input
                        {...input}
                        type="url"
                        maxLength={256}
                      />
                      {(meta.error && meta.touched) && (
                        <InlineError>{meta.error}</InlineError>
                      )}
                    </FormGroup>
                  )}
                </Field>
                <Field name="url">
                  {({ input, meta }) => (
                    <FormGroup>
                      <TextLabel mb="2x">
                        {i18n._('URL')}
                      </TextLabel>
                      <Input
                        {...input}
                        type="url"
                        placeholder="/widget/"
                      />
                      {(meta.error && meta.touched) && (
                        <InlineError>{meta.error}</InlineError>
                      )}
                    </FormGroup>
                  )}
                </Field>
              </Modal.Body>
              <FormSpy
                subscription={{
                  values: true,
                  invalid: true,
                }}
              >
                {({ values, invalid }) => {
                  const canSaveChanges = (() => {
                    if (invalid) {
                      return false;
                    }

                    return true;
                  })();

                  return (
                    <Modal.Footer>
                      <Button
                        btnStyle="default"
                        onClick={onClose}
                      >
                        {i18n._('Cancel')}
                      </Button>
                      <Button
                        btnStyle="primary"
                        disabled={!canSaveChanges}
                        onClick={handleSubmit}
                      >
                        {i18n._('Save Changes')}
                      </Button>
                    </Modal.Footer>
                  );
                }}
              </FormSpy>
            </>
          );
        }}
      </Form>
    </Modal>
  );
};

export default SettingsModal;
