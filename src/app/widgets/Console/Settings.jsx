import noop from 'lodash/noop';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Modal from 'app/components/Modal';
import i18n from 'app/lib/i18n';
import {
  BACKGROUND_DARK,
  BACKGROUND_LIGHT,
  CURSOR_COLORS,
  DEFAULT_BACKGROUND,
  DEFAULT_CURSOR_COLOR,
  DEFAULT_FONT_SIZE,
  DEFAULT_TEXT_COLOR,
  FONT_SIZE_LARGE,
  FONT_SIZE_MEDIUM,
  FONT_SIZE_SMALL,
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
  cyan: i18n._('Cyan'),
  red: i18n._('Red')
}[name]);

const errorStyle = { color: 'var(--color-error-text, #a94442)' };
const hintStyle = { color: 'var(--color-text-hint, #767676)', marginTop: 4 };

class Settings extends PureComponent {
    static propTypes = {
      fontSize: PropTypes.string,
      cols: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      rows: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      background: PropTypes.string,
      textColor: PropTypes.string,
      cursorColor: PropTypes.string,
      onSave: PropTypes.func,
      onCancel: PropTypes.func
    };

    static defaultProps = {
      fontSize: DEFAULT_FONT_SIZE,
      cols: TERMINAL_COLS,
      rows: TERMINAL_ROWS,
      background: DEFAULT_BACKGROUND,
      textColor: DEFAULT_TEXT_COLOR,
      cursorColor: DEFAULT_CURSOR_COLOR,
      onSave: noop,
      onCancel: noop
    };

    state = {
      fontSize: this.props.fontSize,
      cols: String(this.props.cols),
      rows: String(this.props.rows),
      background: this.props.background,
      textColor: this.props.textColor,
      cursorColor: this.props.cursorColor,
      errors: {}
    };

    handleChange = (name) => (event) => {
      this.setState({ [name]: event.target.value });
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

      const { fontSize, background, textColor, cursorColor } = this.state;
      this.props.onSave({ fontSize, cols, rows, background, textColor, cursorColor });
    };

    handleCancel = () => {
      this.props.onCancel();
    };

    render() {
      const { fontSize, cols, rows, background, textColor, cursorColor, errors } = this.state;
      const theme = buildTerminalTheme(background, textColor, cursorColor);

      return (
        <Modal disableOverlay size="sm" onClose={this.handleCancel}>
          <Modal.Header>
            <Modal.Title>{i18n._('Console Settings')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="form-group">
              <label><strong>{i18n._('Font Size')}</strong></label>
              <select className="form-control" value={fontSize} onChange={this.handleChange('fontSize')}>
                <option value={FONT_SIZE_LARGE}>{i18n._('Large')}</option>
                <option value={FONT_SIZE_MEDIUM}>{i18n._('Medium')}</option>
                <option value={FONT_SIZE_SMALL}>{i18n._('Small')}</option>
              </select>
            </div>

            <div className="form-group">
              <label><strong>{i18n._('Terminal Size')}</strong></label>
              <div style={{ display: 'flex', columnGap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label>{i18n._('Columns')}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="form-control"
                    value={cols}
                    onChange={this.handleChange('cols')}
                  />
                  {errors.cols && <small style={errorStyle}>{errors.cols}</small>}
                </div>
                <div style={{ flex: 1 }}>
                  <label>{i18n._('Rows')}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="form-control"
                    value={rows}
                    onChange={this.handleChange('rows')}
                  />
                  {errors.rows && <small style={errorStyle}>{errors.rows}</small>}
                </div>
              </div>
              <div style={hintStyle}>
                {i18n._('Columns also limit how long a command you can type.')}
              </div>
            </div>

            <div className="form-group">
              <label><strong>{i18n._('Terminal Colors')}</strong></label>
              <div style={{ display: 'flex', columnGap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label>{i18n._('Background')}</label>
                  <select className="form-control" value={background} onChange={this.handleChange('background')}>
                    <option value={BACKGROUND_DARK}>{i18n._('Dark')}</option>
                    <option value={BACKGROUND_LIGHT}>{i18n._('Light')}</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label>{i18n._('Text')}</label>
                  <select className="form-control" value={textColor} onChange={this.handleChange('textColor')}>
                    {TEXT_COLORS.map(name => (
                      <option key={name} value={name}>{colorLabel(name)}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label>{i18n._('Cursor')}</label>
                  <select className="form-control" value={cursorColor} onChange={this.handleChange('cursorColor')}>
                    {CURSOR_COLORS.map(name => (
                      <option key={name} value={name}>{colorLabel(name)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div
                style={{
                  marginTop: 8,
                  padding: '6px 8px',
                  border: '1px solid var(--color-border-strong, #ccc)',
                  fontFamily: 'Consolas, Menlo, Monaco, monospace',
                  fontSize: 13,
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
            </div>
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
