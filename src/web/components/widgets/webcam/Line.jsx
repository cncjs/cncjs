import React, { Component, PropTypes } from 'react';

class Line extends Component {
    static propTypes = {
        vertical: PropTypes.bool,
        color: PropTypes.string,
        opacity: PropTypes.number,
        length: PropTypes.oneOf([PropTypes.number, PropTypes.string]),
        width: PropTypes.number
    };
    static defaultProps = {
        vertical: false,
        color: '#fff',
        opacity: 0.8,
        length: 0,
        width: 1
    };

    render() {
        const { vertical, color, opacity, length, width, ...props } = this.props;
        const style = {
            ...this.props.style,
            opacity: opacity
        };

        if (vertical) {
            style.borderLeftColor = color;
            style.borderLeftStyle = 'solid';
            style.borderLeftWidth = width;
            style.height = length;
        } else {
            style.borderTopColor = color;
            style.borderTopStyle = 'solid';
            style.borderTopWidth = width;
            style.width = length;
        }

        return (
            <div {...props} style={style} />
        );
    }
}

export default Line;
