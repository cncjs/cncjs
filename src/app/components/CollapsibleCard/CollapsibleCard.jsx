import PropTypes from 'prop-types';
import React, { useState } from 'react';
import Card from 'app/components/Card';
import ToggleIcon from './ToggleIcon';
import Header from './Header';
import Body from './Body';
import { CollapsibleCardContext } from './context';
import { useStateFromProps } from './hooks';

const CollapsibleCard = ({
    collapsed: nextCollapsed,

    // https://github.com/Stanko/react-animate-height#props
    easing = 'ease',
    duration = 250,

    children,
    ...props
}) => {
    const [collapsed, setCollapsed] = useStateFromProps(nextCollapsed);
    const [collapsing, setCollapsing] = useState(false);
    const toggle = (value) => {
        if (value === undefined || value !== collapsed) {
            setCollapsing(true);
            setCollapsed(!collapsed);
        }
    };

    return (
        <CollapsibleCardContext.Provider
            value={{
                duration,
                easing,
                collapsed,
                collapsing,
                setCollapsing,
                toggle,
            }}
        >
            <Card {...props}>
                {typeof children === 'function' && children({
                    collapsed,
                    collapsing,
                    toggle,
                    ToggleIcon,
                    Header,
                    Body,
                })}
            </Card>
        </CollapsibleCardContext.Provider>
    );
};

CollapsibleCard.ToggleIcon = ToggleIcon;
CollapsibleCard.Header = Header;
CollapsibleCard.Body = Body;

CollapsibleCard.propTypes = {
    collapsed: PropTypes.bool,
    easing: PropTypes.string,
    duration: PropTypes.number,
};

export default CollapsibleCard;
