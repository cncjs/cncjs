import React from 'react';
import CSSModules from 'react-css-modules';
import styles from './index.styl';

const Panel = (props) => {
    const { children, ...others } = props;

    return (
        <div {...others} styleName="panel panel-default">
            {children}
        </div>
    );
};

export default CSSModules(Panel, styles, { allowMultiple: true });
