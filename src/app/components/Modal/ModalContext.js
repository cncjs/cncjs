import React, { Component } from 'react';
import PropTypes from 'prop-types';

export const ModalStateContext = React.createContext();
export const ModalSettingsContext = React.createContext();
export const ModalActionContext = React.createContext();

export class ModalProvider extends Component {
    static propTypes = {
        showCloseButton: PropTypes.bool,
        showOverlay: PropTypes.bool,
        disableOverlayClick: PropTypes.bool,
    };

    static defaultProps = {
        showCloseButton: true,
        showOverlay: true,
        disableOverlayClick: false,
    };

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

    settings = Object.freeze({
        showCloseButton: (this.props.showCloseButton !== undefined) ? this.props.showCloseButton : true,
        showOverlay: (this.props.showOverlay !== undefined) ? this.props.showOverlay : true,
        disableOverlayClick: (this.props.disableOverlayClick !== undefined) ? this.props.disableOverlayClick : false,
    });

    render() {
        return (
            <ModalStateContext.Provider value={this.state}>
                <ModalSettingsContext.Provider value={this.settings}>
                    <ModalActionContext.Provider value={this.action}>
                        {this.props.children}
                    </ModalActionContext.Provider>
                </ModalSettingsContext.Provider>
            </ModalStateContext.Provider>
        );
    }
}

// Modal Consumer only expose ModalActionContext
export const ModalConsumer = ModalActionContext.Consumer;
