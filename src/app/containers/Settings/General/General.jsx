import classNames from 'classnames';
import get from 'lodash/get';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import FacebookLoading from 'react-facebook-loading';
import Space from 'app/components/Space';
import { SUPPORTED_LANGUAGES } from 'app/constants/i18n';
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
      allowAnonymousUsageDataCollection: null,
    };

    handlers = {
      changeAllowAnonymousUsageDataCollection: (event) => {
        const { actions } = this.props;
        actions.toggleAllowAnonymousUsageDataCollection();
      },
      changeAccessibilitySetting: (key) => (event) => {
        const { actions } = this.props;
        actions.toggleAccessibilitySetting(key);
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
      const { state, stateChanged, actions } = this.props;
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
          <div style={{ marginBottom: 24 }}>
            <h5>{i18n._('Data Collection')}</h5>
            <div className={styles.formFields}>
              <div className={styles.formGroup}>
                <div className="checkbox">
                  <label>
                    <input
                      ref={(node) => {
                        this.fields.allowAnonymousUsageDataCollection = node;
                      }}
                      type="checkbox"
                      checked={state.allowAnonymousUsageDataCollection}
                      onChange={this.handlers.changeAllowAnonymousUsageDataCollection}
                    />
                    {i18n._('Enable anonymous usage data collection')}
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <h5>{i18n._('Language')}</h5>
            <div className={styles.formFields}>
              <div
                className={styles.formGroup}
                style={{
                  display: 'flex',
                  columnGap: '8px',
                  alignItems: 'center',
                }}
              >
                <label>{i18n._('Display language:')}</label>
                <select
                  className={classNames(
                    'form-control',
                    styles.formControl,
                    styles.short
                  )}
                  value={lang}
                  onChange={this.handlers.changeLanguage}
                >
                  {SUPPORTED_LANGUAGES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <h5>{i18n._('Accessibility')}</h5>
            <div className={styles.formFields}>
              <div className={styles.formGroup}>
                <div className="checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={state.accessibility.focusIndicators}
                      onChange={this.handlers.changeAccessibilitySetting('focusIndicators')}
                    />
                    {i18n._('Enable high-contrast focus indicators')}
                  </label>
                </div>
                <div className="checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={state.accessibility.liveRegions}
                      onChange={this.handlers.changeAccessibilitySetting('liveRegions')}
                    />
                    {i18n._('Enable screen reader live regions for status updates')}
                  </label>
                </div>
                <div className="checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={state.accessibility.consoleAccessibility}
                      onChange={this.handlers.changeAccessibilitySetting('consoleAccessibility')}
                    />
                    {i18n._('Enable console accessibility (screen reader mode)')}
                  </label>
                </div>
                <div className="checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={state.accessibility.visualizerText}
                      onChange={this.handlers.changeAccessibilitySetting('visualizerText')}
                    />
                    {i18n._('Enable textual description for 3D visualizer')}
                  </label>
                </div>
                <div className="checkbox" style={{ marginLeft: 20 }}>
                  <label>
                    <input
                      type="checkbox"
                      disabled={!state.accessibility.visualizerText}
                      checked={state.accessibility.visualizerTextVisible}
                      onChange={this.handlers.changeAccessibilitySetting('visualizerTextVisible')}
                    />
                    {i18n._('Show visualizer text description (visually hidden if unchecked)')}
                  </label>
                </div>
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn btn-default"
                    onClick={() => actions.openModal('keyboard-shortcuts')}
                  >
                    {i18n._('Keyboard Shortcuts')}
                  </button>
                </div>
              </div>
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
                    : <i className="fa fa-save" />}
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
