import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Anchor from 'app/components/Anchor';
import styles from './index.styl';

class Notification extends Component {
    static propTypes = {
        /** One of: 'error', 'warning', 'info', 'success' */
        type: PropTypes.oneOf([
            '',
            'error',
            'success',
            'warning',
            'info'
        ]),

        /** Whether or not the component is visible. */
        show: PropTypes.bool,

        /** It's only used for initial render when the `show` prop is not specified. */
        defaultShow: PropTypes.bool,

        /** Whether or not the notification is dismissible. */
        dismissible: PropTypes.bool,

        /** The auto dismiss timeout. */
        autoDismiss: PropTypes.oneOfType([
            PropTypes.number,
            PropTypes.bool
        ]),

        /** A callback fired when the dismiss icon (x) is clicked. */
        onDismiss: PropTypes.func
    };
    static defaultProps = {
        type: '',
        dismissible: true,
        autoDismiss: false,
        onDismiss: (event) => {}
    };

    state = {
        show: this.props.defaultShow === undefined ? true : this.props.defaultShow
    };

    dismissTimer = null;

    dismissAfter = (timeout) => {
        if (this.dismissTimer) {
            clearTimeout(this.dismissTimer);
            this.dismissTimer = null;
        }
        this.dismissTimer = setTimeout(() => {
            this.dismiss();
        }, timeout);
    };

    dismiss = () => {
        if (typeof this.props.onDismiss === 'function') {
            this.props.onDismiss();
        }
        this.setState({ show: false });
    };

    visible = () => {
        return (this.props.show !== undefined) ? this.props.show : this.state.show;
    };

    componentDidMount() {
        if (this.visible()) {
            const { autoDismiss } = this.props;
            if (typeof autoDismiss === 'number' && autoDismiss > 0) {
                this.dismissAfter(autoDismiss);
            }
        }
    }
    componentDidUpdate() {
        if (this.visible()) {
            const { autoDismiss } = this.props;
            if (typeof autoDismiss === 'number' && autoDismiss > 0) {
                this.dismissAfter(autoDismiss);
            }
        }
    }
    componentWillUnmount() {
        if (this.dismissTimer) {
            clearTimeout(this.dismissTimer);
            this.dismissTimer = null;
        }
    }

    render() {
        const {
            type,
            dismissible,
            className,
            children,
            ...props
        } = this.props;
        const icon = (
            <i
                className={cx(
                    styles.icon,
                    {
                        [styles.iconError]: type === 'error',
                        [styles.iconWarning]: type === 'warning',
                        [styles.iconInfo]: type === 'info',
                        [styles.iconSuccess]: type === 'success'
                    }
                )}
            />
        );
        const dismiss = (
            <Anchor
                onClick={this.dismiss}
                className={styles.btnDismiss}
            />
        );

        delete props.show;
        delete props.defaultShow;
        delete props.autoDismiss;
        delete props.onDismiss;

        const visible = this.visible();

        return (
            <div
                {...props}
                className={cx(
                    className,
                    styles.notification,
                    {
                        [styles.fade]: true,
                        [styles.in]: visible,
                        [styles.dismissed]: !visible,
                        [styles.error]: type === 'error',
                        [styles.warning]: type === 'warning',
                        [styles.info]: type === 'info',
                        [styles.success]: type === 'success'
                    }
                )}
            >
                {visible && icon}
                {dismissible && visible && dismiss}
                {visible && children}
            </div>
        );
    }
}

export default Notification;
