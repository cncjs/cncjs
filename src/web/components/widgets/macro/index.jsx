import _ from 'lodash';
import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import i18n from '../../../lib/i18n';
import Widget from '../../widget';
import Macro from './Macro';
import api from '../../../api';
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
    componentDidMount() {
        this.getAllMacros();
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
    async getAllMacros() {
        try {
            let res;
            res = await api.getAllMacros();
            const macros = res.body;
            this.setState({ macros: macros });
        } catch (err) {
            // FIXME
        }
    }
    async addMacro({ name, content }) {
        try {
            let res;
            res = await api.addMacro({ name, content });
            res = await api.getAllMacros();
            const macros = res.body;
            this.setState({ macros: macros });
        } catch (err) {
            // FIXME
            console.log(err);
        }
    }
    async removeMacro({ id }) {
        try {
            let res;
            res = await api.removeMacro({ id });
            res = await api.getAllMacros();
            const macros = res.body;
            this.setState({ macros: macros });
        } catch (err) {
            // FIXME
            console.log(err);
        }
    }
    async updateMacro({ id, name, content }) {
        try {
            let res;
            res = await api.updateMacro({ id, name, content });
            res = await api.getAllMacros();
            const macros = res.body;
            this.setState({ macros: macros });
        } catch (err) {
            // FIXME
            console.log(err);
        }
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
            updateMacro: ::this.updateMacro,
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
