import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import styles from './index.styl';

class BreadcrumbsItem extends PureComponent {
    static propTypes = {
        active: PropTypes.bool
    };
    static defaultProps = {
        active: false
    };

    render() {
        const {
            className,
            active,
            ...props
        } = this.props;

        return (
            <li
                {...props}
                className={cx(
                    className,
                    { [styles.active]: active }
                )}
            />
        );
    }
}

export default BreadcrumbsItem;
