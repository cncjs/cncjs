import contains from 'dom-helpers/contains';
import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';

const escapeKeyCode = 27;

const isLeftClickEvent = (event) => {
  return event.button === 0;
};

const isModifiedEvent = (event) => {
  return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
};

// The `<RootCloseWrapper/>` component registers your callback on the document
// when rendered. Powers the `<Overlay/>` component. This is used achieve modal
// style behavior where your callback is triggered when the user tries to
// interact with the rest of the document or hits the `esc` key.
class RootCloseWrapper extends React.Component {
  static propTypes = {
    // Callback fired after click or mousedown. Also triggers when user hits `esc`.
    onRootClose: PropTypes.func,

    // Children to render.
    children: PropTypes.element,

    // Disable the the RootCloseWrapper, preventing it from triggering `onRootClose`.
    disabled: PropTypes.bool,

    // Choose which document mouse event to bind to.
    event: PropTypes.oneOf(['click', 'mousedown'])
  };

  static defaultProps = {
    event: 'click'
  };

  handleMouseCapture = (e) => {
    this.preventMouseRootClose = (
      isModifiedEvent(e) ||
            !isLeftClickEvent(e) ||
            contains(ReactDOM.findDOMNode(this), e.target)
    );
  };

  handleMouse = (e) => {
    if (!this.preventMouseRootClose && this.props.onRootClose) {
      this.props.onRootClose(e);
    }
  };

  handleKeyUp = (e) => {
    if (e.keyCode === escapeKeyCode && this.props.onRootClose) {
      this.props.onRootClose(e);
    }
  };

  constructor(props, context) {
    super(props, context);
    this.preventMouseRootClose = false;
  }

  componentDidMount() {
    if (!this.props.disabled) {
      this.addEventListeners();
    }
  }

  componentDidUpdate(prevProps) {
    if (!this.props.disabled && prevProps.disabled) {
      this.addEventListeners();
    } else if (this.props.disabled && !prevProps.disabled) {
      this.removeEventListeners();
    }
  }

  componentWillUnmount() {
    if (!this.props.disabled) {
      this.removeEventListeners();
    }
  }

  addEventListeners() {
    const { event } = this.props;
    // Use capture for this listener so it fires before React's listener, to
    // avoid false positives in the contains() check below if the target DOM
    // element is removed in the React mouse callback.
    window.addEventListener(event, this.handleMouseCapture, true);
    window.addEventListener(event, this.handleMouse);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  removeEventListeners() {
    const { event } = this.props;
    window.removeEventListener(event, this.handleMouseCapture, true);
    window.removeEventListener(event, this.handleMouse);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  render() {
    return this.props.children;
  }
}

export default RootCloseWrapper;
