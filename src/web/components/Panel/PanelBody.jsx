import React from 'react';
import CSSModules from 'react-css-modules';
import styles from './index.styl';

const PanelBody = (props) => {
    const { children, ...others } = props;

    return (
        <div {...others} styleName="panel-body">
            {children}
        </div>
    );
};

export default CSSModules(PanelBody, styles);
