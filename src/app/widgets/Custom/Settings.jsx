import noop from 'lodash/noop';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Modal from 'app/components/Modal';
import i18n from 'app/lib/i18n';

class Settings extends PureComponent {
    static propTypes = {
      config: PropTypes.object,
      onCancel: PropTypes.func,
      onSave: PropTypes.func
    };

    static defaultProps = {
      config: PropTypes.object,
      onCancel: noop,
      onSave: noop
    };

    config = this.props.config;

    fields = {
      title: null,
      url: null
    };

    load = () => {
      return {
        title: this.config.get('title'),
        url: this.config.get('url')
      };
    };

    save = () => {
      const title = this.fields.title.value;
      const url = this.fields.url.value;
      this.config.set('title', title);
      this.config.set('url', url);
    };

    render() {
      const {
        title,
        url
      } = this.load();

      return (
        <Modal disableOverlay size="sm" onClose={this.props.onCancel}>
          <Modal.Header>
            <Modal.Title>{i18n._('Settings')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="form-group">
              <label><strong>{i18n._('Title')}</strong></label>
              <div>
                <input
                  ref={node => {
                    this.fields.title = node;
                  }}
                  type="url"
                  className="form-control"
                  defaultValue={title}
                  maxLength={256}
                />
              </div>
            </div>
            <div className="form-group">
              <label><strong>{i18n._('URL')}</strong></label>
              <div>
                <input
                  ref={node => {
                    this.fields.url = node;
                  }}
                  type="url"
                  className="form-control"
                  placeholder="/widget/"
                  defaultValue={url}
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              className="btn btn-default"
              onClick={this.props.onCancel}
            >
              {i18n._('Cancel')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={event => {
                this.save();

                // Update parent state
                this.props.onSave(event);
              }}
            >
              {i18n._('Save Changes')}
            </button>
          </Modal.Footer>
        </Modal>
      );
    }
}

export default Settings;
