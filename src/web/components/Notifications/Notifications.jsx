import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { State } from '../styleMaps';
import styles from './index.styl';
import Anchor from '../Anchor';

class Notifications extends PureComponent {
    static propTypes = {
        bsStyle: PropTypes.oneOf(State.values()),
        onDismiss: PropTypes.func
    };
    static defaultProps = {
        bsStyle: 'warning'
    };

    renderDismissButton() {
        return (
            <Anchor
                onClick={this.props.onDismiss}
                className={styles.close}
            >
                ×
            </Anchor>
        );
    }
    render() {
        const { children, bsStyle, onDismiss, className, ...props } = this.props;
        const isDismissable = !!onDismiss;

        return (
            <div
                {...props}
                className={classNames(
                    className,
                    styles.notifications,
                    styles['notifications-' + bsStyle]
                )}
            >
                {isDismissable ? this.renderDismissButton() : null}
                {children}
            </div>
        );
    }
}

export default Notifications;
