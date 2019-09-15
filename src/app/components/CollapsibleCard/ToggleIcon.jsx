import React, { useContext } from 'react';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import { CollapsibleCardContext } from './context';

const ToggleIcon = ({ style, ...props }) => {
    const { duration, collapsed } = useContext(CollapsibleCardContext);

    return (
        <FontAwesomeIcon
            icon="chevron-down"
            fixedWidth
            style={{
                color: '#222',
                transform: collapsed ? 'rotate(90deg)' : 'none',
                transition: `${duration || 0}ms transform ease-in-out`,
                ...style,
            }}
        />
    );
};

export default ToggleIcon;
