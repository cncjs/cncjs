import _ from 'lodash';
import React, { Component } from 'react';
import CSSModules from 'react-css-modules';
import styles from './index.styl';

@CSSModules(styles)
class ModalBody extends Component {
    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props);
    }
    render() {
        return (
            <div
                {...this.props}
                styleName="modal-body"
            />
        );
    }
}

export default ModalBody;
