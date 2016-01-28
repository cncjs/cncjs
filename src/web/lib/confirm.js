import React from 'react';
import ReactDOM from 'react-dom';
import Confirm from '../components/common/Confirm';

// @param {object} options The options object
// @param {string} [options.message] The message string
// @param {string} [options.description] The description string
// @param {string} [options.confirmLabel] The text for the OK button
// @param {string} [options.cancelLabel] The text for the Cancel button
// @param {function} [confirmCallback] The confirm callback
// @param {function} [cancelCallback] The cancel callback
const confirm = (options = {}, confirmCallback, cancelCallback) => {
    const el = document.body.appendChild(document.createElement('div'));  
    const handleClose = (e) => {
        ReactDOM.unmountComponentAtNode(el);
        setTimeout(() => {
            el.remove();
        }, 0);
    };
    const handleConfirm = (e) => {
        confirmCallback && confirmCallback();
    };
    const handleCancel = (e) => {
        cancelCallback && cancelCallback();
    };

    ReactDOM.render(
        <Confirm {...options}
            onClose={handleClose}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
        />,
        el
    );
};

export default confirm;
