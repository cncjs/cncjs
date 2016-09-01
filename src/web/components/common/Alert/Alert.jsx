import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import styleMaps, { Sizes, State } from '../styleMaps';
import styles from './index.styl';
import Anchor from '../Anchor';

@CSSModules(styles, { allowMultiple: true })
class Alert extends Component {
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
                styleName="close"
            >
                ×
            </Anchor>
        );
    }
    render() {
        const { children, bsStyle, onDismiss } = this.props;
        const isDismissable = !!onDismiss;

        return (
            <div
                {...this.props}
                role="alert"
                styleName={classNames(
                    'alert',
                    'alert-' + bsStyle
                )}
            >
                {isDismissable ? this.renderDismissButton() : null}
                {children}
            </div>
        );
    }
}

export default Alert;
