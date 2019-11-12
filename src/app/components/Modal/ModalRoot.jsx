import React from 'react';
import { ModalContext } from './ModalContext';

const ModalRoot = () => (
    <ModalContext.Consumer>
        {({ modals, closeModal }) => modals.map((modal, key) => {
            const {
                component: Component,
                props,
            } = modal;

            return (
                <Component
                    {...props}
                    key={`modal:${key}`}
                    onClose={closeModal}
                />
            );
        })}
    </ModalContext.Consumer>
);

export default ModalRoot;
