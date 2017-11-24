import React from 'react';
import Icon from 'react-icon-base';

const Extruder = ({ color = '#000', ...props }) => {
    const stroke = {
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
            <path style={stroke.st2} d="M63 68h11c1.6 0 3 1.4 3 3s-1.4 3-3 3H49" />
            <path style={stroke.st1} d="M48 80h14l-9 11h-5.7L44 85" />
            <path style={stroke.st2} d="M71 68V37.5c0-1.9-1.6-3.5-3.5-3.5H41" />
            <path style={stroke.st1} d="M57 24h4.3L66 34H52.3z" />
            <path style={stroke.st2} d="M59 21v-3c0-1.6 1.8-3 4-3h7c2.2 0 4-1.8 4-4V3" />
            <path
                style={stroke.st1}
                d="M41.8 59.6c-2.1-2-3.8-5.9-3.8-8.8V10.2C38 7.3 35.7 5 32.8 5h-2.6C27.3 5 25 7.3 25 10.2v40.6c0 2.9-1.6 6.9-3.5 9 0 0-3.5 3.8-3.5 9.2 0 7.7 6.3 14 14 14s14-6.3 14-14c0-5.4-4.2-9.4-4.2-9.4z"
            />
            <circle
                cx={32}
                cy={69}
                r={8}
                fill={color}
                stroke={color}
                strokeWidth={2}
                strokeMiterlimit={10}
            />
            <path style={stroke.st1} d="M38 45h-6M38 37h-6M38 29h-6M38 21h-6M71 68H60" />
            <path fill={color} d="M34 56h-4l-1 6h6z" />
        </Icon>
    );
};

export default Extruder;
