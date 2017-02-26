import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import CSSModules from 'react-css-modules';
import i18n from '../../lib/i18n';
import styles from './index.styl';

@CSSModules(styles, { allowMultiple: true })
class JogPad extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        const { state, actions } = this.props;
        const { canClick, keypadJogging, selectedAxis } = state;

        return (
            <div styleName="jog-pad">
                <div styleName="row-space">
                    <div className="row no-gutters">
                        <div className="col-xs-3">
                            <div styleName="col-space">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-x-minus jog-y-plus"
                                    onClick={() => {
                                        const distance = actions.getJogDistance();
                                        actions.jog({ X: -distance, Y: distance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move X- Y+')}
                                >
                                    <i className="fa fa-arrow-circle-up" styleName="rotate--45deg" style={{ fontSize: 16 }} />
                                </button>
                            </div>
                        </div>
                        <div
                            className="col-xs-3"
                            styleName={classNames(
                                { 'jog-direction-highlight': keypadJogging || selectedAxis === 'y' }
                            )}
                        >
                            <div styleName="col-space">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-y-plus"
                                    onClick={() => {
                                        const distance = actions.getJogDistance();
                                        actions.jog({ Y: distance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move Y+')}
                                >
                                    <span styleName="jog-text">Y+</span>
                                </button>
                            </div>
                        </div>
                        <div className="col-xs-3">
                            <div styleName="col-space">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-x-plus jog-y-plus"
                                    onClick={() => {
                                        const distance = actions.getJogDistance();
                                        actions.jog({ X: distance, Y: distance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move X+ Y+')}
                                >
                                    <i className="fa fa-arrow-circle-up" styleName="rotate-45deg" style={{ fontSize: 16 }} />
                                </button>
                            </div>
                        </div>
                        <div
                            className="col-xs-3"
                            styleName={classNames(
                                { 'jog-direction-highlight': keypadJogging || selectedAxis === 'z' }
                            )}
                        >
                            <div styleName="col-space">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-z-plus"
                                    onClick={() => {
                                        const distance = actions.getJogDistance();
                                        actions.jog({ Z: distance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move Z+')}
                                >
                                    <span styleName="jog-text">Z+</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div styleName="row-space">
                    <div className="row no-gutters">
                        <div
                            className="col-xs-3"
                            styleName={classNames(
                                { 'jog-direction-highlight': keypadJogging || selectedAxis === 'x' }
                            )}
                        >
                            <div styleName="col-space">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-x-minus"
                                    onClick={() => {
                                        const distance = actions.getJogDistance();
                                        actions.jog({ X: -distance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move X-')}
                                >
                                    <span styleName="jog-text">X-</span>
                                </button>
                            </div>
                        </div>
                        <div className="col-xs-3">
                            <div styleName="col-space">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-xy-zero"
                                    onClick={() => actions.move({ X: 0, Y: 0 })}
                                    disabled={!canClick}
                                    title={i18n._('Move To XY Zero (G0 X0 Y0)')}
                                >
                                    <span styleName="jog-text">X/Y</span>
                                </button>
                            </div>
                        </div>
                        <div
                            className="col-xs-3"
                            styleName={classNames(
                                { 'jog-direction-highlight': keypadJogging || selectedAxis === 'x' }
                            )}
                        >
                            <div styleName="col-space">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-x-plus"
                                    onClick={() => {
                                        const distance = actions.getJogDistance();
                                        actions.jog({ X: distance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move X+')}
                                >
                                    <span styleName="jog-text">X+</span>
                                </button>
                            </div>
                        </div>
                        <div className="col-xs-3">
                            <div styleName="col-space">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-z-zero"
                                    onClick={() => actions.move({ Z: 0 })}
                                    disabled={!canClick}
                                    title={i18n._('Move To Z Zero (G0 Z0)')}
                                >
                                    <span styleName="jog-text">Z</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div styleName="row-space">
                    <div className="row no-gutters">
                        <div className="col-xs-3">
                            <div styleName="col-space">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-x-minus jog-y-minus"
                                    onClick={() => {
                                        const distance = actions.getJogDistance();
                                        actions.jog({ X: -distance, Y: -distance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move X- Y-')}
                                >
                                    <i className="fa fa-arrow-circle-down" styleName="rotate-45deg" style={{ fontSize: 16 }} />
                                </button>
                            </div>
                        </div>
                        <div
                            className="col-xs-3"
                            styleName={classNames(
                                { 'jog-direction-highlight': keypadJogging || selectedAxis === 'y' }
                            )}
                        >
                            <div styleName="col-space">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-y-minus"
                                    onClick={() => {
                                        const distance = actions.getJogDistance();
                                        actions.jog({ Y: -distance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move Y-')}
                                >
                                    <span styleName="jog-text">Y-</span>
                                </button>
                            </div>
                        </div>
                        <div className="col-xs-3">
                            <div styleName="col-space">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-x-plus jog-y-minus"
                                    onClick={() => {
                                        const distance = actions.getJogDistance();
                                        actions.jog({ X: distance, Y: -distance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move X+ Y-')}
                                >
                                    <i className="fa fa-arrow-circle-down" styleName="rotate--45deg" style={{ fontSize: 16 }} />
                                </button>
                            </div>
                        </div>
                        <div
                            className="col-xs-3"
                            styleName={classNames(
                                { 'jog-direction-highlight': keypadJogging || selectedAxis === 'z' }
                            )}
                        >
                            <div styleName="col-space">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-z-minus"
                                    onClick={() => {
                                        const distance = actions.getJogDistance();
                                        actions.jog({ Z: -distance });
                                    }}
                                    disabled={!canClick}
                                    title={i18n._('Move Z-')}
                                >
                                    <span styleName="jog-text">Z-</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default JogPad;
