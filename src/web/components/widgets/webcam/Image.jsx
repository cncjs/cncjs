import React, { Component, PropTypes } from 'react';

class Image extends Component {
    static propTypes = {
        src: PropTypes.string
    };
    static defaultProps = {
        src: ''
    };

    render() {
        const { src, ...props } = this.props;

        return (
            <img
                {...props}
                role="presentation"
                src={src}
            />
        );
    }
}

export default Image;
