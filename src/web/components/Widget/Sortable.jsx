import classNames from 'classnames';
import React from 'react';
import Anchor from '../Anchor';
import styles from './index.styl';

const Sortable = (props) => {
    const { children, className, style, ...rest } = props;

    return (
        <div className={classNames(className, styles.widgetSortable)} style={style}>
            <Anchor {...rest}>
                {children}
            </Anchor>
        </div>
    );
};

export default Sortable;
