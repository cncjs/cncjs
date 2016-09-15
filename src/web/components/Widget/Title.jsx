import React, { Component } from 'react';
import CSSModules from 'react-css-modules';
import styles from './index.styl';

@CSSModules(styles)
class Title extends Component {
    render() {
        return (
            <div
                {...this.props}
                styleName="widget-title"
            />
        );
    }
}

export default Title;
