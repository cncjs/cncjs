import React, { Component, PropTypes } from 'react';

class Circle extends Component {
    static propTypes = {
        color: PropTypes.string,
        diameter: PropTypes.number,
        width: PropTypes.number
    };
    static defaultProps = {
        color: '#fff',
        diameter: 0,
        width: 1
    };

    render() {
        const { color, diameter, width, ...props } = this.props;
        const style = {
            borderRadius: '50%',
            borderColor: color,
            borderStyle: 'solid',
            borderWidth: width,
            width: diameter,
            height: diameter
        };
        return (
            <div {...props} style={style} />
        );
    }
}

export default Circle;
