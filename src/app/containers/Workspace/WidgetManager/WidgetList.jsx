import PropTypes from 'prop-types';
import React from 'react';
import WidgetListItem from './WidgetListItem';

const WidgetList = (props) => {
  const { list, onChange } = props;
  const style = {
    maxHeight: Math.max(window.innerHeight / 2, 200),
    overflowY: 'scroll',
    padding: 15,
  };

  return (
    <div style={{ ...style, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15 }}>
      {list.map((o) => (
        <WidgetListItem
          key={o.id}
          id={o.id}
          caption={o.caption}
          details={o.details}
          checked={o.visible}
          disabled={o.disabled}
          onChange={onChange}
        />
      ))}
    </div>
  );
};

WidgetList.propTypes = {
  list: PropTypes.array.isRequired,
  onChange: PropTypes.func
};

export default WidgetList;
