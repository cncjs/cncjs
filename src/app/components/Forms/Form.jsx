import PropTypes from 'prop-types';
import React, { Component } from 'react';

class Form extends Component {
    static propTypes = {
        componentClass: PropTypes.oneOfType([
            PropTypes.func,
            PropTypes.string
        ]),
        innerRef: PropTypes.oneOfType([
            PropTypes.func,
            PropTypes.object,
            PropTypes.string
        ])
    };

    static defaultProps = {
        componentClass: 'form',
    };

    getRef = (ref) => {
        if (typeof this.props.innerRef === 'function') {
            this.props.innerRef(ref);
        }
        this.ref = ref;
    };

    submit = () => {
        if (this.ref) {
            this.ref.submit();
        }
    };

    render() {
        const {
            componentClass: Component,
            innerRef,
            ...props
        } = this.props;

        return (
            <Component {...props} ref={innerRef} />
        );
    }
}

export default Form;
