import React from 'react';
import createForm from '../../createForm';

const options = {
    onValidate: function(props, errors) {
        const { onValidate } = props;

        if (typeof onValidate !== 'function') {
            return;
        }

        if (errors.length > 0) {
            props.onValidate(errors);
        } else {
            props.onValidate();
        }
    }
};

const Form = (props) => {
    props = { ...props };
    delete props.onValidate;

    return (
        <form {...props} />
    );
};

export default createForm(options)(Form);
