import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import Anchor from '../Anchor';
import styles from './index.styl';

class Toggler extends Component {
    static propTypes = {
        onToggle: PropTypes.func.isRequired
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        const { onToggle, className, ...props } = this.props;

        return (
            <Anchor
                {...props}
                className={classNames(className, styles.toggler)}
                onClick={(event) => {
                    onToggle(event);
                }}
            />
        );
    }
}

export default Toggler;
