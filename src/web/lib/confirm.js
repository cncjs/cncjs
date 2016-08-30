import React from 'react';
import ReactDOM from 'react-dom';
import Confirm from '../components/common/Confirm';
import i18n from './i18n';

const noop = () => {};

// @param {object} options The options object
// @param {function} [ok] The callback for handling the [OK] button
// @param {function} [cancel] The callback for handling the [Cancel] button
const confirm = (options, ok = noop, cancel = noop) => {
    const {
        txtOK = i18n._('OK'),
        txtCancel = i18n._('Cancel'),
        ...props
    } = { ...options };

    //const el = document.body.appendChild(document.createElement('div'));
    const el = document.createElement('div');
    ReactDOM.render(
        <Confirm
            txtOK={txtOK}
            txtCancel={txtCancel}
            {...props}
            show={true}
            onOK={(event) => {
                ok(event);

                ReactDOM.unmountComponentAtNode(el);
                setTimeout(() => {
                    el.remove();
                }, 0);
            }}
            onCancel={(event) => {
                cancel(event);

                ReactDOM.unmountComponentAtNode(el);
                setTimeout(() => {
                    el.remove();
                }, 0);
            }}
        />,
        el
    );
};

export default confirm;
