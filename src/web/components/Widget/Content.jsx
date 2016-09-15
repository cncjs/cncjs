import React, { Component } from 'react';
import CSSModules from 'react-css-modules';
import styles from './index.styl';

@CSSModules(styles)
class Content extends Component {
    render() {
        return (
            <div
                {...this.props}
                styleName="widget-content"
            />
        );
    }
}

export default Content;
