import {
  Grid,
} from '@tonic-ui/react';
import React from 'react';
import WidgetListItem from './WidgetListItem';

/**
 * @param {{
 *   data?: Array<{ caption?: string, details?: string, disabled?: boolean, id: string, visible?: boolean }>,
 *   onChange?: ({ id: string, checked: boolean }) => void,
 * }} props
 * @returns {JSX.Element}
 */
function WidgetList({ data = [], onChange = () => {} }) {
  return (
    <Grid
      gap="3x"
      templateColumns="repeat(auto-fit, minmax(240px, 1fr))"
    >
      {data.map(widget => (
        <WidgetListItem
          key={widget.id}
          caption={widget.caption}
          checked={widget.visible}
          details={widget.details}
          disabled={widget.disabled}
          id={widget.id}
          onChange={onChange}
        />
      ))}
    </Grid>
  );
}

export default WidgetList;
