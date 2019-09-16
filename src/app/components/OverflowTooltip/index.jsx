import React, { useRef, useLayoutEffect } from 'react';

const OverflowTooltip = ({ title, ...props }) => {
    const ref = useRef(null);

    // Use useLayoutEffect for making DOM measurements and mutations
    useLayoutEffect(() => {
        const el = ref.current;
        if (el) {
            // overflow appears if the scrollWidth is greater than the clientWidth
            const overflow = (el.clientWidth < el.scrollWidth);
            el.title = overflow ? title : '';
        }
    });

    return (
        <div ref={ref} {...props} />
    );
};

export default OverflowTooltip;
