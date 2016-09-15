import React, { Component } from 'react';
import CSSModules from 'react-css-modules';
import styles from './index.styl';

@CSSModules(styles)
class Footer extends Component {
    render() {
        return (
            <div
                {...this.props}
                styleName="widget-footer"
            />
        );
    }
}

export default Footer;
