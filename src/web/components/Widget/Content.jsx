import React, { Component } from 'react';
import CSSModules from 'react-css-modules';
import styles from './index.styl';

@CSSModules(styles)
class Content extends Component {
    render() {
        const { children, ...others } = this.props;

        return (
            <div
                {...others}
                styleName="widget-content"
            >
                {children}
            </div>
        );
    }
}

export default Content;
