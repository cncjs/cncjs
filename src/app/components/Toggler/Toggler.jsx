import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Anchor from '../Anchor';
import styles from './index.styl';

class Toggler extends PureComponent {
    static propTypes = {
        onToggle: PropTypes.func.isRequired
    };

    render() {
        const { onToggle, className, ...props } = this.props;

        return (
            <Anchor
                {...props}
                className={cx(className, styles.toggler)}
                onClick={(event) => {
                    onToggle(event);
                }}
            />
        );
    }
}

export default Toggler;
