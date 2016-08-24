import React, { Component, PropTypes } from 'react';

class Line extends Component {
    static propTypes = {
        vertical: PropTypes.bool,
        color: PropTypes.string,
        length: PropTypes.oneOf([PropTypes.number, PropTypes.string]),
        width: PropTypes.number
    };
    static defaultProps = {
        vertical: false,
        color: '#fff',
        length: 0,
        width: 1
    };

    render() {
        const { length, width, color, vertical, ...props } = this.props;
        const style = {};

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
