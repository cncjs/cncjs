import React from 'react';
import CSSModules from 'react-css-modules';
import styles from './index.styl';

const PanelHeading = (props) => {
    const { children, ...others } = props;

    return (
        <div {...others} styleName="panel-heading">
            {children}
        </div>
    );
};

export default CSSModules(PanelHeading, styles);
