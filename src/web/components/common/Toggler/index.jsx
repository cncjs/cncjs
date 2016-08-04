import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import styles from './index.styl';

@CSSModules(styles)
class Toggler extends Component {
    static propTypes = {
        expanded: PropTypes.bool,
        onToggle: PropTypes.func.isRequired
    };
    static defaultProps = {
        expanded: true
    };

    render() {
        const { expanded, ...others } = this.props;

        return (
            <div
                {...others}
                styleName="toggler"
                onClick={(event) => {
                    this.props.onToggle(event);
                }}
            >
                <i
                    className={classNames(
                        'fa',
                        { 'fa-chevron-up': expanded },
                        { 'fa-chevron-down': !expanded }
                    )}
                />
            </div>
        );
    }
}

export default Toggler;
