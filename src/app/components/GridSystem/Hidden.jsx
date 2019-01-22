import PropTypes from 'prop-types';
import React from 'react';
import Resolver from './Resolver';

const hidden = (screenClass, { xs, sm, md, lg, xl, xxl }) => {
    if (screenClass === 'xxl') {
        return !!xxl;
    }
    if (screenClass === 'xl') {
        return !!xl;
    }
    if (screenClass === 'lg') {
        return !!lg;
    }
    if (screenClass === 'md') {
        return !!md;
    }
    if (screenClass === 'sm') {
        return !!sm;
    }
    if (screenClass === 'xs') {
        return !!xs;
    }
    return true; // Defaults to true
};

const Hidden = ({ xs, sm, md, lg, xl, xxl, children }) => (
    <Resolver>
        {({ screenClass }) => {
            if (hidden(screenClass, { xs, sm, md, lg, xl, xxl })) {
                return null;
            }

            return children;
        }}
    </Resolver>
);

Hidden.propTypes = {
    // Hidden on extra small devices.
    xs: PropTypes.bool,

    // Hidden on small devices.
    sm: PropTypes.bool,

    // Hidden on medium devices.
    md: PropTypes.bool,

    // Hidden on large devices.
    lg: PropTypes.bool,

    // Hidden on extra large devices.
    xl: PropTypes.bool,

    // Hidden on double extra large devices.
    xxl: PropTypes.bool,
};

Hidden.defaultProps = {
    xs: false,
    sm: false,
    md: false,
    lg: false,
    xl: false,
    xxl: false,
};

export default Hidden;
