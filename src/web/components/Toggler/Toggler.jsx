import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import CSSModules from 'react-css-modules';
import styles from './index.styl';

@CSSModules(styles)
class Toggler extends Component {
    static propTypes = {
        onToggle: PropTypes.func.isRequired
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
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
