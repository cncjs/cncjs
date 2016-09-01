import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import styles from './index.styl';

@CSSModules(styles)
class Toggler extends Component {
    static propTypes = {
        onToggle: PropTypes.func.isRequired
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props);
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
