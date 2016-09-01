import _ from 'lodash';
import React, { Component } from 'react';
import CSSModules from 'react-css-modules';
import styles from './index.styl';

@CSSModules(styles)
class ModalFooter extends Component {
    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props);
    }
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
