import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import styles from './index.styl';

class ModalHeader extends PureComponent {
    static propTypes = {
        padding: PropTypes.oneOfType([PropTypes.bool, PropTypes.string])
    };
    static defaultProps = {
        padding: true
    };

    render() {
        const { style = {}, padding, ...props } = this.props;

        if (typeof padding === 'string') {
            style.padding = padding;
        }

        return (
            <div
                {...props}
                style={style}
                className={classNames(
                    styles.modalHeader,
                    { [styles.padding]: !!padding }
                )}
            />
        );
    }
}

export default ModalHeader;
