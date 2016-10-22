import React, { Component } from 'react';
import styles from './index.styl';

class BreadcrumbDivider extends Component {
    render() {
        return (
            <span className={styles['tm-divider']}>›</span>
        );
    }
}

export default BreadcrumbDivider;
