import React, { Component, PropTypes } from 'react';

class Image extends Component {
    static propTypes = {
        src: PropTypes.string,
        style: PropTypes.object
    };
    static defaultProps = {
        src: '',
        style: {}
    };

    render() {
        const { src, style, ...props } = this.props;

        return (
            <img
                {...props}
                role="presentation"
                src={src}
                style={{
                    width: '100%',
                    height: 'auto',
                    ...style
                }}
            />
        );
    }
}

export default Image;
