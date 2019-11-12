import React, { Component } from 'react';

export const ModalContext = React.createContext({
    modals: [],
    openModal: () => {},
    closeModal: () => {},
});

export class ModalProvider extends Component {
    openModal = (component, props = {}) => {
        this.setState(state => ({
            modals: state.modals.concat({ component, props }),
        }));
    };

    closeModal = () => {
        this.setState(state => ({
            modals: state.modals.slice(0, state.modals.length - 1),
        }));
    };

    state = {
        modals: [],
        openModal: this.openModal,
        closeModal: this.closeModal,
    };

    render() {
        return (
            <ModalContext.Provider value={this.state}>
                {this.props.children}
            </ModalContext.Provider>
        );
    }
}

export const ModalConsumer = ModalContext.Consumer;
