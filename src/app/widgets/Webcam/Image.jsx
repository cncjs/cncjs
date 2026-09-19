import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';

class Image extends PureComponent {
    static propTypes = {
      innerRef: PropTypes.func,
      src: PropTypes.string
    };

    static defaultProps = {
      src: ''
    };

    render() {
      const { innerRef, src, ...props } = this.props;

      return (
        <img
          {...props}
          ref={innerRef}
          src={src}
          alt=""
        />
      );
    }
}

export default Image;
