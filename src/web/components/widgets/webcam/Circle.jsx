import React, { Component, PropTypes } from 'react';

class Circle extends Component {
    static propTypes = {
        color: PropTypes.string,
        opacity: PropTypes.number,
        diameter: PropTypes.number,
        width: PropTypes.number
    };
    static defaultProps = {
        color: '#fff',
        opacity: 0.8,
        diameter: 0,
        width: 1
    };

    render() {
        const { color, opacity, diameter, width, ...props } = this.props;
        const style = {
            backgroundClip: 'padding-box',
            borderRadius: '50%',
            borderColor: color,
            borderStyle: 'solid',
            borderWidth: width,
            opacity: opacity,
            width: diameter,
            height: diameter
        };
        return (
            <div {...props} style={style} />
        );
    }
}

export default Circle;
