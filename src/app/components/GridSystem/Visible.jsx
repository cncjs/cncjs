import PropTypes from 'prop-types';
import React from 'react';
import Resolver from './Resolver';

const visible = (screenClass, { xs, sm, md, lg, xl, xxl }) => {
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

const Visible = ({ xs, sm, md, lg, xl, xxl, children }) => (
    <Resolver>
        {({ screenClass }) => {
            if (visible(screenClass, { xs, sm, md, lg, xl, xxl })) {
                return children;
            }

            return null;
        }}
    </Resolver>
);

Visible.propTypes = {
    // Visible on extra small devices.
    xs: PropTypes.bool,

    // Visible on small devices.
    sm: PropTypes.bool,

    // Visible on medimum devices.
    md: PropTypes.bool,

    // Visible on large devices.
    lg: PropTypes.bool,

    // Visible on extra large devices.
    xl: PropTypes.bool,

    // Visible on double extra large devices.
    xxl: PropTypes.bool,
};

Visible.defaultProps = {
    xs: false,
    sm: false,
    md: false,
    lg: false,
    xl: false,
    xxl: false,
};

export default Visible;
