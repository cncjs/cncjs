import React from 'react';
import { ModalStateContext, ModalActionContext } from './ModalContext';

const ModalRoot = () => (
    <ModalStateContext.Consumer>
        {({ modals }) => (
            <ModalActionContext.Consumer>
                {({ closeModal }) => modals.map((modal, key) => {
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
            </ModalActionContext.Consumer>
        )}
    </ModalStateContext.Consumer>
);

export default ModalRoot;
