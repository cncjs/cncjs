import PropTypes from 'prop-types';
import React from 'react';
import Resolver from './Resolver';

const ScreenClass = ({ render, children }) => (
    <Resolver>
        {({ screenClass }) => {
            if (typeof children === 'function') {
                return children(screenClass);
            }

            if (typeof render === 'function') {
                return render(screenClass);
            }

            return children;
        }}
    </Resolver>
);

ScreenClass.propTypes = {
    render: PropTypes.func
};

export default ScreenClass;
