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
        rule: (value, components) => {
            value = value || '';
            return value.toString().trim().length > 0;
        },
        // Function to return hint
        // You may use current value to inject it in some way to the hint
        hint: (value) => {
            return (
                <HelpBlock>{i18n._('This field is required.')}</HelpBlock>
            );
        }
    },
    password: {
        // rule function can accept argument:
        // components - components registered to Form mapped by name
        rule: (value, components) => {
            const password = components.password.state;
            const passwordConfirm = components.passwordConfirm.state;
            const isBothUsed = password
                && passwordConfirm
                && password.isUsed
                && passwordConfirm.isUsed;
            const isBothChanged = isBothUsed && password.isChanged && passwordConfirm.isChanged;

            if (!isBothUsed || !isBothChanged) {
                return true;
            }

            return password.value === passwordConfirm.value;
        },
        hint: () => {
            return (
                <HelpBlock>{i18n._('Passwords should be equal.')}</HelpBlock>
            );
        }
    }
});

export default Validation;
