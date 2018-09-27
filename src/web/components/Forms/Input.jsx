import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';

class Input extends Component {
    static propTypes = {
        componentClass: PropTypes.oneOfType([
            PropTypes.func,
            PropTypes.string
        ]),
        innerRef: PropTypes.oneOfType([
            PropTypes.func,
            PropTypes.object,
            PropTypes.string
        ]),
        type: PropTypes.string
    };

    static defaultProps = {
        componentClass: 'input',
        type: 'text'
    };

    get value() {
        if (!this.ref) {
            return null;
        }

        const node = ReactDOM.findDOMNode(this.ref);

        return node ? node.value : null;
    }

    getRef = (ref) => {
        if (typeof this.props.innerRef === 'function') {
            this.props.innerRef(ref);
        }
        this.ref = ref;
    };

    focus = () => {
        if (this.ref) {
            this.ref.focus();
        }
    };

    render() {
        const {
            componentClass: Component,
            innerRef,
            className,
            ...props
        } = this.props;

        return (
            <Component {...props} ref={innerRef} className={cx(className, 'form-control')} />
        );
    }
}

export default Input;
