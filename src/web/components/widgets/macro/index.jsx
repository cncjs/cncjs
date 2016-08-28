import _ from 'lodash';
import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import i18n from '../../../lib/i18n';
import Widget from '../../widget';
import Macro from './Macro';
import {
    MODAL_STATE_NONE
} from './constants';
import styles from './index.styl';

@CSSModules(styles, { allowMultiple: true })
class MacroWidget extends Component {
    static propTypes = {
        onDelete: PropTypes.func
    };
    static defaultProps = {
        onDelete: () => {}
    };

    constructor() {
        super();
        this.state = this.getDefaultState();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state);
    }
    getDefaultState() {
        return {
            isCollapsed: false,
            isFullscreen: false,
            macros: [],
            modalState: MODAL_STATE_NONE,
            modalParams: {}
        };
    }
    openModal(modalState = MODAL_STATE_NONE, modalParams = {}) {
        this.setState({
            modalState: modalState,
            modalParams: modalParams
        });
    }
    closeModal() {
        this.setState({
            modalState: MODAL_STATE_NONE,
            modalParams: {}
        });
    }
    addMacro() {
        const macros = this.state.macros;

        this.setState({
            macros: macros.concat([
                {
                    name: new Date().getTime()
                }
            ])
        });
    }
    removeMacro(id) {
        const macros = this.state.macros;

        this.setState({
            macros: macros.filter((macro, index) => {
                return (index !== id);
            })
        });
    }
    render() {
        const { isCollapsed, isFullscreen } = this.state;
        const state = {
            ...this.state
        };
        const actions = {
            openModal: ::this.openModal,
            closeModal: ::this.closeModal,
            addMacro: ::this.addMacro,
            removeMacro: ::this.removeMacro
        };

        return (
            <Widget {...this.props} fullscreen={isFullscreen}>
                <Widget.Header>
                    <Widget.Title>{i18n._('Macro')}</Widget.Title>
                    <Widget.Controls>
                        <Widget.Button
                            type="toggle"
                            defaultValue={isCollapsed}
                            onClick={(event, val) => this.setState({ isCollapsed: !!val })}
                        />
                        <Widget.Button
                            type="fullscreen"
                            defaultValue={isFullscreen}
                            onClick={(event, val) => this.setState({ isFullscreen: !!val })}
                        />
                        <Widget.Button
                            type="delete"
                            onClick={(event) => this.props.onDelete()}
                        />
                    </Widget.Controls>
                </Widget.Header>
                <Widget.Content
                    styleName={classNames(
                        'widget-content',
                        { 'hidden': isCollapsed }
                    )}
                >
                    <Macro
                        state={state}
                        actions={actions}
                    />
                </Widget.Content>
            </Widget>
        );
    }
}

export default MacroWidget;
