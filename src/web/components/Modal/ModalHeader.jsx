import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import styles from './index.styl';

@CSSModules(styles, { allowMultiple: true })
class ModalHeader extends Component {
    static propTypes = {
        padding: PropTypes.oneOf([PropTypes.bool, PropTypes.string])
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
                styleName={classNames(
                    'modal-header',
                    { 'padding': !!padding }
                )}
            />
        );
    }
}

export default ModalHeader;
