import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Button } from '../Buttons';
import Dropdown from '../Dropdown';
import styles from './index.styl';

class DropdownButton extends Component {
  static propTypes = {
    ...Dropdown.propTypes,

    // One of: 'default', 'primary', 'emphasis', 'flat', 'link'
    btnStyle: Button.propTypes.btnStyle,

    // toggle
    toggle: PropTypes.node.isRequired,

    // Align the menu to the right side of the dropdown toggle.
    pullRight: PropTypes.bool,

    // Whether to prevent a caret from being rendered next to the title.
    noCaret: PropTypes.bool
  };

  static defaultProps = {
    pullRight: true,
    noCaret: true
  };

  render() {
    const { toggle, style, children, ...props } = this.props;

    // Split component props
    const dropdownProps = {};
    const toggleProps = {};
    Object.keys(props).forEach(propName => {
      const propValue = props[propName];
      if (Dropdown.ControlledComponent.propTypes[propName]) {
        dropdownProps[propName] = propValue;
      } else {
        toggleProps[propName] = propValue;
      }
    });

    return (
      <Dropdown
        {...dropdownProps}
        style={{
          ...style,
          float: 'left'
        }}
      >
        <Dropdown.Toggle
          {...toggleProps}
          className={styles.widgetButton}
          componentClass="a"
        >
          {toggle}
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {children}
        </Dropdown.Menu>
      </Dropdown>
    );
  }
}

export default DropdownButton;
