import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import FacebookLoading from 'react-facebook-loading';
import Space from 'app/components/Space';
import i18n from 'app/lib/i18n';
import styles from './index.styl';

class Controller extends PureComponent {
    static propTypes = {
      initialState: PropTypes.object,
      state: PropTypes.object,
      stateChanged: PropTypes.bool,
      actions: PropTypes.object
    };

    fields = {
      ignoreErrors: null,
    };

    handlers = {
      handleChangeIgnoreErrors: (event) => {
        const { actions } = this.props;
        actions.toggleIgnoreErrors();
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
        <form
          style={{
            marginTop: -10,
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <h5>{i18n._('Exception')}</h5>
            <div className={styles.formFields}>
              <div className={styles.formGroup}>
                <div className="checkbox">
                  <label>
                    <input
                      ref={(node) => {
                        this.fields.ignoreErrors = node;
                      }}
                      type="checkbox"
                      checked={state.ignoreErrors}
                      onChange={this.handlers.handleChangeIgnoreErrors}
                    />
                    {i18n._('Continue execution when an error is detected in the G-code program')}
                  </label>
                  <p style={{ marginLeft: 20 }}>
                    <span className="text-warning">
                      <i className="fa fa-exclamation-circle" />
                    </span>
                    <Space width="4" />
                    <span>{i18n._('Enabling this option may cause machine damage if you don\'t have an Emergency Stop button to prevent a dangerous situation.')}</span>
                  </p>
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

export default Controller;
