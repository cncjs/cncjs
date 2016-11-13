import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import styles from './index.styl';

class TableToolbar extends Component {
    static propTypes = {
        border: PropTypes.bool
    };
    static defaultProps = {
        border: true
    };

    render() {
        const { className, border, ...props } = this.props;

        return (
            <div
                {...props}
                className={classNames(
                    className,
                    styles.tableToolbar,
                    { [styles.noBorder]: !border }
                )}
            />
        );
    }
}

export default TableToolbar;
