import React from 'react';
import Icon from 'react-icon-base';

const HeatedBed = ({ color = '#000', ...props }) => {
    const stroke = {
        st0: {
            fill: 'none',
            stroke: color,
            strokeWidth: 4,
            strokeLinecap: 'round',
            strokeMiterlimit: 10
        },
        st1: {
            fill: 'none',
            stroke: color,
            strokeWidth: 4,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            strokeMiterlimit: 10
        },
        st2: {
            fill: 'none',
            stroke: color,
            strokeWidth: 4,
            strokeLinejoin: 'round',
            strokeMiterlimit: 10
        }
    };

    return (
        <Icon viewBox="0 0 96 96" color={color} {...props}>
            <path
                style={stroke.st0}
                d="M90 77.2c0-2.3-1.9-4.2-4.2-4.2H10.2C7.9 73 6 74.9 6 77.2v1.6c0 2.3 1.9 4.2 4.2 4.2h75.6c2.3 0 4.2-1.9 4.2-4.2v-1.6zM15 83l5-10M25 83l5-10M35 83l5-10M45 83l5-10M55 83l5-10M65 83l5-10M75 83l5-10"
            />
            <path
                style={stroke.st2}
                d="M14 86v6h8v-6M74 86v6h8v-6"
            />
            <path
                style={stroke.st1}
                d="M48 66s4-12.2 4-16.7c0-4.8-8-11.7-8-16.7 0-4.5 4-16.7 4-16.7M64 66s4-12.2 4-16.7c0-4.8-8-11.7-8-16.7 0-4.5 4-16.7 4-16.7M32 66s4-12.2 4-16.7c0-4.8-8-11.7-8-16.7 0-4.5 4-16.7 4-16.7M80 66s4-12.2 4-16.7c0-4.8-8-11.7-8-16.7 0-4.5 4-16.7 4-16.7M16 66s4-12.2 4-16.7c0-4.8-8-11.7-8-16.7 0-4.5 4-16.7 4-16.7"
            />
        </Icon>
    );
};

export default HeatedBed;
