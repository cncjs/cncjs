import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Checkbox,
  Flex,
} from '@tonic-ui/react';
import React from 'react';
import i18n from '@app/lib/i18n';

/**
 * @param {{
 *   caption?: string,
 *   checked?: boolean,
 *   details?: string,
 *   disabled?: boolean,
 *   id?: string,
 *   onChange?: ({ id: string, checked: boolean }) => void,
 * }} props
 * @returns {JSX.Element}
 */
function WidgetListItem({
  caption = '',
  checked = false,
  details = '',
  disabled = false,
  id = '',
  onChange = () => {},
}) {
  const handleChange = (event) => {
    onChange({
      checked: event.target.checked,
      id,
    });
  };

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'border.secondary',
        height: '100%',
      }}
    >
      <Box
        mb="3x"
        sx={{
          backgroundColor: 'background.medium',
          borderBottom: '1px solid',
          borderColor: 'border.secondary',
          padding: '12px',
          textAlign: 'center',
        }}
      >
        <Flex justify="center" color="text.secondary">
          <FontAwesomeIcon
            icon="list-alt"
            style={{
              filter: checked ? 'drop-shadow(4px 4px 4px rgba(0, 0, 0, 0.3))' : 'none',
              fontSize: 100,
              opacity: checked ? 1 : 0.6,
            }}
          />
        </Flex>
      </Box>
      <Box mb="3x" px="3x">
        <Flex align="center" justify="space-between">
          <Box
            as="strong"
            opacity={checked ? 1 : 0.6}
          >
            {caption}
          </Box>
          <Checkbox
            checked={checked}
            disabled={disabled}
            inputProps={{ 'aria-label': caption }}
            title={checked ? i18n._('On') : i18n._('Off')}
            onChange={handleChange}
          />
        </Flex>
      </Box>
      <Box
        mb="3x"
        opacity={checked ? 1 : 0.6}
        px="3x"
      >
        {details}
      </Box>
    </Box>
  );
}

export default WidgetListItem;
