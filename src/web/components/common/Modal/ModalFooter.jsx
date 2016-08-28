import React, { Component } from 'react';
import CSSModules from 'react-css-modules';
import styles from './index.styl';

@CSSModules(styles)
class ModalFooter extends Component {
    render() {
        return (
            <div
                {...this.props}
                styleName="modal-footer"
            />
        );
    }
}

export default ModalFooter;
