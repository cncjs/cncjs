import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import styles from './index.styl';

@CSSModules(styles)
class Toggler extends Component {
    static propTypes = {
        onToggle: PropTypes.func.isRequired
    };

    render() {
        const { onToggle, ...props } = this.props;

        return (
            <div
                {...props}
                styleName="toggler"
                onClick={(event) => {
                    onToggle(event);
                }}
            />
        );
    }
}

export default Toggler;
