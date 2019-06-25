import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import styles from './index.styl';

class TogglerIcon extends PureComponent {
    static propTypes = {
        expanded: PropTypes.bool
    };

    static defaultProps = {
        expanded: false
    };

    render() {
        const { expanded, className, ...props } = this.props;

        return (
            <i
                {...props}
                className={classNames(
                    className,
                    styles.togglerIcon,
                    'fa',
                    { 'fa-chevron-up': expanded },
                    { 'fa-chevron-down': !expanded }
                )}
            />
        );
    }
}

export default TogglerIcon;
