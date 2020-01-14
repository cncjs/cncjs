import React from 'react';
import { ModalStateContext, ModalActionContext } from './ModalContext';

const ModalRoot = () => (
    <ModalStateContext.Consumer>
        {({ modals }) => (
            <ModalActionContext.Consumer>
                {({ closeModal }) => modals.map((modal, idx) => {
                    const {
                        component: Component,
                        props,
                    } = modal;
                    const key = `modal:${idx}`;

                    return (
                        <Component
                            {...props}
                            key={key}
                            onClose={closeModal}
                        />
                    );
                })}
            </ModalActionContext.Consumer>
        )}
    </ModalStateContext.Consumer>
);

export default ModalRoot;
