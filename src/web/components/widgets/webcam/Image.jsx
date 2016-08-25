import React, { Component, PropTypes } from 'react';

class Image extends Component {
    static propTypes = {
        src: PropTypes.string,
        scale: PropTypes.number
    };
    static defaultProps = {
        src: '',
        scale: 1.0
    };

    render() {
        const { src, scale, ...props } = this.props;
        const style = {
            width: (100 * scale).toFixed(0) + '%',
            height: 'auto'
        };
        return (
            <img {...props} style={style} src={src} alt="" />
        );
    }
}

export default Image;
