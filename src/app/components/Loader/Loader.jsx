import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import cx from 'classnames';
import styles from './index.styl';

class Loader extends PureComponent {
    static propTypes = {
        size: PropTypes.oneOf([
            'lg',
            'md',
            'sm',
            'large',
            'medium',
            'small'
        ]),
        overlay: PropTypes.bool
    };
    static defaultProps = {
        size: 'md',
        overlay: false
    };

    render() {
        const {
            size,
            overlay,
            className,
            ...props
        } = this.props;

        return (
            <div
                {...props}
                className={cx(
                    className,
                    styles.loaderContainer,
                    { [styles.loaderOverlay]: overlay }
                )}
            >
                <i
                    className={cx(
                        styles.loader,
                        { [styles.large]: size === 'large' || size === 'lg' },
                        { [styles.medium]: size === 'medium' || size === 'md' },
                        { [styles.small]: size === 'small' || size === 'sm' }
                    )}
                />
            </div>
        );
    }
}

export default Loader;
