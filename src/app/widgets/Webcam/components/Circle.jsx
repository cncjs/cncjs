import PropTypes from 'prop-types';
import React, { Component } from 'react';

class Circle extends Component {
  static propTypes = {
    style: PropTypes.object,
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
    const { style, color, opacity, diameter, width, ...props } = this.props;
    const componentStyle = {
      backgroundClip: 'padding-box',
      borderRadius: '50%',
      borderColor: color,
      borderStyle: 'solid',
      borderWidth: width,
      boxShadow: '0 0 2px #333',
      opacity: opacity,
      width: diameter,
      height: diameter,
      ...style,
    };

    return (
      <div {...props} style={componentStyle} />
    );
  }
}

export default Circle;
