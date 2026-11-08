import { CheckIcon, CloseIcon } from '@tonic-ui/react-icons';
import noop from 'lodash/noop';
import React, { useEffect, useRef } from 'react';
import {
  Button,
  Input,
  InputGroup,
  InputGroupAppend,
} from '@tonic-ui/react';
import i18n from '@app/lib/i18n';

/**
 * @param {{ value?: string, onChange?: (value: string) => void, onSave?: (value: string) => void, onCancel?: () => void, min?: number, max?: number, className?: string, style?: object }} props
 * @returns {JSX.Element}
 */
function PositionInput({
  value = '',
  onChange = noop,
  onSave = noop,
  onCancel = noop,
  min = -10000,
  max = 10000,
  className,
  style,
}) {
  const node = useRef(null);

  useEffect(() => {
    node.current?.focus();
  }, []);

  const isNumber = value !== '';

  return (
    <InputGroup
      className={className}
      style={{ ...style, width: '100%' }}
    >
      <Input
        aria-label={i18n._('Position value')}
        ref={node}
        type="number"
        flex="1"
        minWidth="0"
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;

          if (nextValue === '') {
            onChange('');
            return;
          }
          if (nextValue >= min && nextValue <= max) {
            onChange(nextValue);
          }
        }}
        onKeyDown={(event) => {
          if (event.keyCode === 13) { // ENTER
            onSave(value);
          }
          if (event.keyCode === 27) { // ESC
            onCancel();
          }
        }}
      />
      <InputGroupAppend>
        <Button
          aria-label={i18n._('Save position')}
          variant="secondary"
          disabled={!isNumber}
          onClick={() => {
            onSave(value);
          }}
        >
          <CheckIcon aria-hidden="true" size="1em" />
        </Button>
      </InputGroupAppend>
      <InputGroupAppend>
        <Button
          aria-label={i18n._('Cancel')}
          variant="secondary"
          onClick={() => {
            onCancel();
          }}
        >
          <CloseIcon aria-hidden="true" size="1em" />
        </Button>
      </InputGroupAppend>
    </InputGroup>
  );
}

export default PositionInput;
