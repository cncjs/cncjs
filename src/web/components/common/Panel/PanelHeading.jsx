import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import styles from './index.styl';

@CSSModules(styles, { allowMultiple: true })
class Panel extends Component {
    render() {
        const { children, ...others } = this.props;

        return (
            <div {...others} styleName="panel-heading">
                {children}
            </div>
        );
    }
}

export default Panel;
