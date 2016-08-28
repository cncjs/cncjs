import React, { Component } from 'react';
import CSSModules from 'react-css-modules';
import styles from './index.styl';

@CSSModules(styles)
class ModalTitle extends Component {
    render() {
        return (
            <div
                {...this.props}
                styleName="modal-title"
            />
        );
    }
}

export default ModalTitle;
