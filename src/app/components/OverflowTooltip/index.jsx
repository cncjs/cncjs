import PropTypes from 'prop-types';
import React from 'react';

class OverflowTooltip extends React.Component {
    static propTypes = {
      title: PropTypes.string
    };

    state = {
      overflow: false
    };

    node = null;

    static getDerivedStateFromProps(nextProps, prevState) {
      return {
        overflow: false
      };
    }

    detectOverflow = () => {
      const el = this.node;
      const overflow = (el.clientWidth < el.scrollWidth);
      if (overflow !== this.state.overflow) {
        this.setState({ overflow: overflow });
      }
    };

    componentDidMount() {
      this.detectOverflow();
    }

    componentDidUpdate() {
      this.detectOverflow();
    }

    render() {
      const { title, ...props } = this.props;

      if (this.state.overflow) {
        props.title = title;
      }

      return (
        <div
          {...props}
          ref={node => {
            this.node = node;
          }}
        />
      );
    }
}

export default OverflowTooltip;
