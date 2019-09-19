import React, { useContext } from 'react';
import AnimateHeight from 'react-animate-height';
import Card from 'app/components/Card';
import { CollapsibleCardContext } from './context';

const Body = ({ children, ...props }) => {
    const { duration, easing, collapsed, collapsing, setCollapsing, toggle } = useContext(CollapsibleCardContext);

    return (
        <AnimateHeight
            duration={duration}
            easing={easing}
            height={collapsed ? 0 : 'auto'}
            onAnimationStart={() => {
                if (!collapsing) {
                    setCollapsing(true);
                }
            }}
            onAnimationEnd={() => {
                if (collapsing) {
                    setCollapsing(false);
                }
            }}
        >
            <Card.Body {...props}>
                {typeof children === 'function'
                    ? children({ collapsed, collapsing, toggle })
                    : children
                }
            </Card.Body>
        </AnimateHeight>
    );
};

export default Body;
