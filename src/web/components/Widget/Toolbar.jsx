import React, { Component } from 'react';
import CSSModules from 'react-css-modules';
import styles from './index.styl';

@CSSModules(styles)
class Toolbar extends Component {
    render() {
        return (
            <div
                {...this.props}
                styleName="widget-toolbar"
            />
        );
    }
}

export default Toolbar;
