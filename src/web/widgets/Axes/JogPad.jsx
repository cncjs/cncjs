import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import i18n from '../../lib/i18n';
import styles from './index.styl';

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
            <div className={styles.jogPad}>
                <div className={styles.rowSpace}>
                    <div className="row no-gutters">
                        <div className="col-xs-3">
                            <div className={styles.colSpace}>
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
                                    <i className={classNames('fa', 'fa-arrow-circle-up', styles['rotate--45deg'])} style={{ fontSize: 16 }} />
                                </button>
                            </div>
                        </div>
                        <div
                            className={classNames(
                                'col-xs-3',
                                { [styles.jogDirectionHighlight]: keypadJogging || selectedAxis === 'y' }
                            )}
                        >
                            <div className={styles.colSpace}>
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
                                    <span className={styles.jogText}>Y+</span>
                                </button>
                            </div>
                        </div>
                        <div className="col-xs-3">
                            <div className={styles.colSpace}>
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
                                    <i className={classNames('fa', 'fa-arrow-circle-up', styles['rotate-45deg'])} style={{ fontSize: 16 }} />
                                </button>
                            </div>
                        </div>
                        <div
                            className={classNames(
                                'col-xs-3',
                                { [styles.jogDirectionHighlight]: keypadJogging || selectedAxis === 'z' }
                            )}
                        >
                            <div className={styles.colSpace}>
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
                                    <span className={styles.jogText}>Z+</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={styles.rowSpace}>
                    <div className="row no-gutters">
                        <div
                            className={classNames(
                                'col-xs-3',
                                { [styles.jogDirectionHighlight]: keypadJogging || selectedAxis === 'x' }
                            )}
                        >
                            <div className={styles.colSpace}>
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
                                    <span className={styles.jogText}>X-</span>
                                </button>
                            </div>
                        </div>
                        <div className="col-xs-3">
                            <div className={styles.colSpace}>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-xy-zero"
                                    onClick={() => actions.move({ X: 0, Y: 0 })}
                                    disabled={!canClick}
                                    title={i18n._('Move To XY Zero (G0 X0 Y0)')}
                                >
                                    <span className={styles.jogText}>X/Y</span>
                                </button>
                            </div>
                        </div>
                        <div
                            className={classNames(
                                'col-xs-3',
                                { [styles.jogDirectionHighlight]: keypadJogging || selectedAxis === 'x' }
                            )}
                        >
                            <div className={styles.colSpace}>
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
                                    <span className={styles.jogText}>X+</span>
                                </button>
                            </div>
                        </div>
                        <div className="col-xs-3">
                            <div className={styles.colSpace}>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-default jog-z-zero"
                                    onClick={() => actions.move({ Z: 0 })}
                                    disabled={!canClick}
                                    title={i18n._('Move To Z Zero (G0 Z0)')}
                                >
                                    <span className={styles.jogText}>Z</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={styles.rowSpace}>
                    <div className="row no-gutters">
                        <div className="col-xs-3">
                            <div className={styles.colSpace}>
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
                                    <i className={classNames('fa', 'fa-arrow-circle-down', styles['rotate-45deg'])} style={{ fontSize: 16 }} />
                                </button>
                            </div>
                        </div>
                        <div
                            className={classNames(
                                'col-xs-3',
                                { [styles.jogDirectionHighlight]: keypadJogging || selectedAxis === 'y' }
                            )}
                        >
                            <div className={styles.colSpace}>
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
                                    <span className={styles.jogText}>Y-</span>
                                </button>
                            </div>
                        </div>
                        <div className="col-xs-3">
                            <div className={styles.colSpace}>
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
                                    <i className={classNames('fa', 'fa-arrow-circle-down', styles['rotate--45deg'])} style={{ fontSize: 16 }} />
                                </button>
                            </div>
                        </div>
                        <div
                            className={classNames(
                                'col-xs-3',
                                { [styles.jogDirectionHighlight]: keypadJogging || selectedAxis === 'z' }
                            )}
                        >
                            <div className={styles.colSpace}>
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
                                    <span className={styles.jogText}>Z-</span>
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
