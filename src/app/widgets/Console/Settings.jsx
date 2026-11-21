import noop from 'lodash/noop';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import uuid from 'uuid';
import Modal from 'app/components/Modal';
import i18n from 'app/lib/i18n';
import {
  BACKGROUND_BLACK,
  BACKGROUND_WHITE,
  DEFAULT_BACKGROUND,
  DEFAULT_FONT_STACK,
  DEFAULT_FONT_SIZE,
  DEFAULT_TEXT_COLOR,
  FONT_SIZES,
  TERMINAL_COLS,
  TERMINAL_COLS_MAX,
  TERMINAL_COLS_MIN,
  TERMINAL_ROWS,
  TERMINAL_ROWS_MAX,
  TERMINAL_ROWS_MIN,
  TEXT_COLORS
} from './constants';
import { buildTerminalTheme } from './terminal-theme';

const parseInteger = (value, min, max) => {
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) {
    return null;
  }
  const n = parseInt(text, 10);
  return (n >= min && n <= max) ? n : null;
};

const colorLabel = (name) => ({
  default: i18n._('Default'),
  green: i18n._('Green'),
  amber: i18n._('Amber'),
  cyan: i18n._('Cyan')
}[name]);

const describedBy = (...ids) => ids.filter(Boolean).join(' ') || undefined;

const errorStyle = { color: 'var(--color-error-text, #a94442)' };
const hintStyle = { color: 'var(--color-text-hint, #767676)', marginTop: 4 };
const groupTitleStyle = { marginBottom: 5 };

class Settings extends PureComponent {
    static propTypes = {
      fontSize: PropTypes.number,
      cols: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      rows: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      background: PropTypes.string,
      textColor: PropTypes.string,
      onSave: PropTypes.func,
      onCancel: PropTypes.func
    };

    static defaultProps = {
      fontSize: DEFAULT_FONT_SIZE,
      cols: TERMINAL_COLS,
      rows: TERMINAL_ROWS,
      background: DEFAULT_BACKGROUND,
      textColor: DEFAULT_TEXT_COLOR,
      onSave: noop,
      onCancel: noop
    };

    // Unique per modal instance, so several Console widgets never share element ids
    fieldId = uuid.v4();

    state = {
      fontSize: this.props.fontSize,
      cols: String(this.props.cols),
      rows: String(this.props.rows),
      background: this.props.background,
      textColor: this.props.textColor,
      errors: {}
    };

    handleChange = (name) => (event) => {
      this.setState({
        [name]: name === 'fontSize' ? Number(event.target.value) : event.target.value,
        errors: { ...this.state.errors, [name]: undefined, form: undefined }
      });
    };

    handleSave = () => {
      const cols = parseInteger(this.state.cols, TERMINAL_COLS_MIN, TERMINAL_COLS_MAX);
      const rows = parseInteger(this.state.rows, TERMINAL_ROWS_MIN, TERMINAL_ROWS_MAX);
      const errors = {};
      if (cols === null) {
        errors.cols = i18n._('Enter a number between {{min}} and {{max}}', { min: TERMINAL_COLS_MIN, max: TERMINAL_COLS_MAX });
      }
      if (rows === null) {
        errors.rows = i18n._('Enter a number between {{min}} and {{max}}', { min: TERMINAL_ROWS_MIN, max: TERMINAL_ROWS_MAX });
      }
      if (errors.cols || errors.rows) {
        this.setState({ errors });
        return;
      }

      const { fontSize, background, textColor } = this.state;
      // onSave returns a message when the settings cannot be applied right now
      const error = this.props.onSave({ fontSize, cols, rows, background, textColor });
      if (error) {
        this.setState({ errors: { form: error } });
      }
    };

    handleCancel = () => {
      this.props.onCancel();
    };

    render() {
      const { fontSize, cols, rows, background, textColor, errors } = this.state;
      const id = this.fieldId;
      const theme = buildTerminalTheme(background, textColor);

      return (
        <Modal disableOverlay size="sm" onClose={this.handleCancel}>
          <Modal.Header>
            <Modal.Title>{i18n._('Console Settings')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div
              className="form-group"
              aria-hidden="true"
              style={{
                padding: '6px 8px',
                border: '1px solid var(--color-border-strong, #ccc)',
                fontFamily: DEFAULT_FONT_STACK,
                fontSize,
                lineHeight: 1.2,
                letterSpacing: 1,
                background: theme.background,
                color: theme.foreground
              }}
            >
              <div>{'> $$'}</div>
              <div>$0=10 (Step pulse time, microseconds)</div>
              <div>
                {'> '}
                <span style={{ background: theme.cursor, color: theme.cursorAccent }}>&nbsp;</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor={`${id}-font-size`}><strong>{i18n._('Font size')}</strong></label>
              <select
                id={`${id}-font-size`}
                style={{ width: 'auto' }}
                className="form-control"
                value={fontSize}
                onChange={this.handleChange('fontSize')}
              >
                {FONT_SIZES.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            <div className="form-group" role="group" aria-labelledby={`${id}-colors`}>
              <div id={`${id}-colors`} style={groupTitleStyle}><strong>{i18n._('Terminal colors')}</strong></div>
              <div style={{ display: 'flex', columnGap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor={`${id}-background`}>{i18n._('Background color')}</label>
                  <select
                    id={`${id}-background`}
                    className="form-control"
                    value={background}
                    onChange={this.handleChange('background')}
                  >
                    <option value={BACKGROUND_BLACK}>{i18n._('Black')}</option>
                    <option value={BACKGROUND_WHITE}>{i18n._('White')}</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor={`${id}-text`}>{i18n._('Text color')}</label>
                  <select
                    id={`${id}-text`}
                    className="form-control"
                    value={textColor}
                    onChange={this.handleChange('textColor')}
                  >
                    {TEXT_COLORS.map(name => (
                      <option key={name} value={name}>{colorLabel(name)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-group" role="group" aria-labelledby={`${id}-size`}>
              <div id={`${id}-size`} style={groupTitleStyle}><strong>{i18n._('Terminal size')}</strong></div>
              <div style={{ display: 'flex', columnGap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor={`${id}-cols`}>{i18n._('Columns')}</label>
                  <input
                    id={`${id}-cols`}
                    type="text"
                    inputMode="numeric"
                    className="form-control"
                    aria-invalid={!!errors.cols}
                    aria-describedby={describedBy(errors.cols && `${id}-cols-error`, `${id}-size-hint`)}
                    value={cols}
                    onChange={this.handleChange('cols')}
                  />
                  {errors.cols && <small id={`${id}-cols-error`} style={errorStyle}>{errors.cols}</small>}
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor={`${id}-rows`}>{i18n._('Rows')}</label>
                  <input
                    id={`${id}-rows`}
                    type="text"
                    inputMode="numeric"
                    className="form-control"
                    aria-invalid={!!errors.rows}
                    aria-describedby={describedBy(errors.rows && `${id}-rows-error`, `${id}-size-hint`)}
                    value={rows}
                    onChange={this.handleChange('rows')}
                  />
                  {errors.rows && <small id={`${id}-rows-error`} style={errorStyle}>{errors.rows}</small>}
                </div>
              </div>
              <div id={`${id}-size-hint`} style={hintStyle}>
                {i18n._('Each command must fit on one line. Use more columns for longer commands.')}
              </div>
            </div>

            {errors.form && <div role="alert" style={errorStyle}>{errors.form}</div>}
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="btn btn-default" onClick={this.handleCancel}>
              {i18n._('Cancel')}
            </button>
            <button type="button" className="btn btn-primary" onClick={this.handleSave}>
              {i18n._('Save Changes')}
            </button>
          </Modal.Footer>
        </Modal>
      );
    }
}

export default Settings;
