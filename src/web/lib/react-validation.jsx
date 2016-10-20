import React from 'react';
import Validation from 'react-validation';
import i18n from './i18n';

const HelpBlock = (props) => {
    const style = {
        color: '#A94442'
    };

    return (
        <div {...props} className="help-block" style={style} />
    );
};

Object.assign(Validation.rules, {
    required: {
        // Function to validate value
        // NOTE: value might be a number -> force to string
        rule: (value = '') => {
            return value.toString().trim();
        },
        // Function to return hint
        // You may use current value to inject it in some way to the hint
        hint: (value) => {
            return (
                <HelpBlock>{i18n._('This field is required.')}</HelpBlock>
            );
        }
    }
});

export default Validation;
