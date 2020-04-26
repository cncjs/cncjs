import classNames from 'classnames';
import get from 'lodash/get';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import FacebookLoading from 'react-facebook-loading';
import Space from 'app/components/Space';
import i18n from 'app/lib/i18n';
import styles from './index.styl';

class General extends PureComponent {
    static propTypes = {
        initialState: PropTypes.object,
        state: PropTypes.object,
        stateChanged: PropTypes.bool,
        actions: PropTypes.object
    };

    fields = {
        checkForUpdates: null
    };

    handlers = {
        changeCheckForUpdates: (event) => {
            const { actions } = this.props;
            actions.toggleCheckForUpdates();
        },
        changeLanguage: (event) => {
            const { actions } = this.props;
            const target = event.target;
            actions.changeLanguage(target.value);
        },
        cancel: (event) => {
            const { actions } = this.props;
            actions.restoreSettings();
        },
        save: (event) => {
            const { actions } = this.props;
            actions.save();
        }
    };

    componentDidMount() {
        const { actions } = this.props;
        actions.load();
    }

    render() {
        const { state, stateChanged } = this.props;
        const lang = get(state, 'lang', 'en');

        if (state.api.loading) {
            return (
                <FacebookLoading
                    delay={400}
                    zoom={2}
                    style={{ margin: '15px auto' }}
                />
            );
        }

        return (
            <form style={{ marginTop: -10 }}>
                <div className={styles.formFields}>
                    <div className={styles.formGroup}>
                        <div className="checkbox">
                            <label>
                                <input
                                    ref={(node) => {
                                        this.fields.checkForUpdates = node;
                                    }}
                                    type="checkbox"
                                    checked={state.checkForUpdates}
                                    onChange={this.handlers.changeCheckForUpdates}
                                />
                                {i18n._('Automatically check for updates')}
                            </label>
                        </div>
                    </div>
                </div>
                <div className={styles.formFields}>
                    <div className={styles.formGroup}>
                        <label>{i18n._('Language')}</label>
                        <select
                            className={classNames(
                                'form-control',
                                styles.formControl,
                                styles.short
                            )}
                            value={lang}
                            onChange={this.handlers.changeLanguage}
                        >
                            <option value="cs">Čeština</option>
                            <option value="de">Deutsch</option>
                            <option value="en">English (US)</option>
                            <option value="es">Español</option>
                            <option value="fr">Français (France)</option>
                            <option value="it">Italiano</option>
                            <option value="hu">Magyar</option>
                            <option value="nl">Nederlands</option>
                            <option value="pt-br">Português (Brasil)</option>
                            <option value="pt-pt">Português (Portugal)</option>
                            <option value="tr">Türkçe</option>
                            <option value="ru">Русский</option>
                            <option value="zh-tw">中文 (繁體)</option>
                            <option value="zh-cn">中文 (简体)</option>
                            <option value="ja">日本語</option>
                        </select>
                    </div>
                </div>
                <div className={styles.formActions}>
                    <div className="row">
                        <div className="col-md-12">
                            <button
                                type="button"
                                className="btn btn-default"
                                onClick={this.handlers.cancel}
                            >
                                {i18n._('Cancel')}
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={!stateChanged}
                                onClick={this.handlers.save}
                            >
                                {state.api.saving
                                    ? <i className="fa fa-circle-o-notch fa-spin" />
                                    : <i className="fa fa-save" />
                                }
                                <Space width="8" />
                                {i18n._('Save Changes')}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        );
    }
}

export default General;
