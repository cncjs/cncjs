import PropTypes from 'prop-types';
import React from 'react';

const Fraction = (props) => {
    const { numerator, denominator } = props;

    return (
        <span
            style={{
                whiteSpace: 'nowrap',
                display: 'inline-block',
                verticalAlign: '-0.5em',
                fontSize: '85%',
                textAlign: 'center'
            }}
        >
            <span
                style={{
                    display: 'block',
                    lineHeight: '1em',
                    margin: '0 0.1em'
                }}
            >
                {numerator}
            </span>
            <span
                style={{
                    position: 'absolute',
                    left: -10000,
                    top: 'auto',
                    width: 1,
                    height: 1,
                    overflow: 'hidden'
                }}
            >
                /
            </span>
            <span
                style={{
                    borderTop: '1px solid',
                    display: 'block',
                    lineHeight: '1em',
                    margin: '0 0.1em',
                    minWidth: 16
                }}
            >
                {denominator}
            </span>
        </span>
    );
};

Fraction.propTypes = {
    numerator: PropTypes.number,
    denominator: PropTypes.number
};

export default Fraction;
