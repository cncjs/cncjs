import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import styles from './index.styl';

class TogglerIcon extends Component {
    static propTypes = {
        expanded: PropTypes.bool
    };
    static defaultProps = {
        expanded: false
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        const { expanded, className, ...props } = this.props;

        return (
            <i
                {...props}
                className={classNames(
                    className,
                    styles.togglerIcon,
                    'fa',
                    { 'fa-chevron-up': expanded },
                    { 'fa-chevron-down': !expanded }
                )}
            />
        );
    }
}

export default TogglerIcon;
