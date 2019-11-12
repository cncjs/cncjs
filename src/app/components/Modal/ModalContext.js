import React, { Component } from 'react';

export const ModalStateContext = React.createContext();
export const ModalActionContext = React.createContext();

export class ModalProvider extends Component {
    state = {
        modals: [],
    };

    action = Object.freeze({
        openModal: (component, props = {}) => {
            this.setState(state => ({
                modals: state.modals.concat({ component, props }),
            }));
        },
        closeModal: () => {
            this.setState(state => ({
                modals: state.modals.slice(0, state.modals.length - 1),
            }));
        },
    });

    render() {
        return (
            <ModalStateContext.Provider value={this.state}>
                <ModalActionContext.Provider value={this.action}>
                    {this.props.children}
                </ModalActionContext.Provider>
            </ModalStateContext.Provider>
        );
    }
}

export const ModalConsumer = ModalActionContext.Consumer;
