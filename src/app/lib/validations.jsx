/* eslint react/prop-types: 0 */
import React from 'react';
import i18n from './i18n';

const Error = (props) => (
    <div {...props} style={{ color: '#A94442' }} />
);

const required = (value, props, components) => {
    if (props.type === 'radio') {
        const name = props.name;

        components = components[name] || [];
        if (components.length === 0) {
            return null;
        }

        // Controls the placement of the error message for radio buttons
        if (components[components.length - 1] !== props) {
            return null;
        }

        const checked = components.reduce((checked, props) => {
            return checked || props.checked;
        }, false);

        if (checked) {
            return null;
        }

        return (
            <Error>{i18n._('This field is required.')}</Error>
        );
    }

    if (props.type === 'checkbox') {
        if (props.checked) {
            return null;
        }

        return (
            <Error>{i18n._('This field is required.')}</Error>
        );
    }

    value = ('' + value).trim();
    if (!value) {
        return (
            <Error>{i18n._('This field is required.')}</Error>
        );
    }

    return null;
};

const password = (value, props, components) => {
    const bothBlurred = components.password[0].blurred && components.confirm[0].blurred;
    const bothChanged = components.password[0].changed && components.confirm[0].changed;

    if (bothBlurred && bothChanged && components.password[0].value !== components.confirm[0].value) {
        return (
            <Error>{i18n._('Passwords should be equal.')}</Error>
        );
    }

    return null;
};

export {
    required,
    password
};
