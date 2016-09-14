import React, { Component } from 'react';
import CSSModules from 'react-css-modules';
import styles from './index.styl';

@CSSModules(styles)
class Toolbar extends Component {
    render() {
        const { children, ...others } = this.props;

        return (
            <div
                {...others}
                styleName="widget-toolbar"
            >
                {children}
            </div>
        );
    }
}

export default Toolbar;
