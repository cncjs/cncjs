import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';

class Image extends PureComponent {
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
                src={src}
                alt=""
            />
        );
    }
}

export default Image;
