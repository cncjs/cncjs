import { Box, Button, FormInput } from '@tonic-ui/react';
import React, { useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import i18n from '@app/lib/i18n';

/** @param {{ onSend: (command: string) => void }} props */
function CommandInput({ onSend }) {
  const form = useForm({ defaultValues: { command: '' } });
  const value = useWatch({ control: form.control, name: 'command' });
  const composing = useRef(false);
  const submitting = useRef(false);
  const submit = () => {
    if (composing.current || submitting.current) {
      return;
    }
    submitting.current = true;
    form.handleSubmit(({ command }) => {
      command = command.trim();
      if (!command) {
        return;
      }
      onSend(command);
      form.resetField('command');
    })().finally(() => {
      submitting.current = false;
    });
  };
  return (
    <Box
      display="flex" gap="2x" p="2x"
      flexShrink={0}
    >
      <FormInput
        flex="1" minWidth={0} type="text"
        {...form.register('command')}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={() => {
          composing.current = false;
        }}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.preventDefault();
            if (!event.nativeEvent.isComposing && event.keyCode !== 229) {
              submit();
            }
          }
        }}
        placeholder={i18n._('Enter a command')} aria-label={i18n._('Command')}
        autoComplete="off" autoCorrect="off" autoCapitalize="off"
        spellCheck={false} enterKeyHint="send"
      />
      <Button
        type="button" onClick={submit} variant="primary"
        disabled={!value.trim()}
      >{i18n._('Send')}
      </Button>
    </Box>
  );
}

export default CommandInput;
