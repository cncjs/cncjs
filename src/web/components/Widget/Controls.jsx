import React, { Component } from 'react';
import CSSModules from 'react-css-modules';
import styles from './index.styl';

@CSSModules(styles)
class Controls extends Component {
    render() {
        return (
            <div
                {...this.props}
                styleName="widget-controls"
            />
        );
    }
}

export default Controls;
