import React, { useContext } from 'react';
import Card from 'app/components/Card';
import Clickable from 'app/components/Clickable';
import { CollapsibleCardContext } from './context';

const Header = ({ children, style, ...props }) => {
    const { collapsed, collapsing, toggle } = useContext(CollapsibleCardContext);

    return (
        <Clickable
            onClick={toggle}
            style={{ width: '100%' }}
        >
            {({ hovered }) => (
                <Card.Header
                    {...props}
                    style={{
                        backgroundColor: hovered ? 'rgba(0, 0, 0, 0.075)' : 'rgba(0, 0, 0, 0.05)',
                        borderBottomWidth: (collapsed && !collapsing) ? 0 : 1,
                        ...style,
                    }}
                >
                    {typeof children === 'function'
                        ? children({ collapsed, collapsing, toggle, hovered })
                        : children
                    }
                </Card.Header>
            )}
        </Clickable>
    );
};

export default Header;
