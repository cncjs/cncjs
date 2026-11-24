import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import i18n from 'app/lib/i18n';
import styles from './index.styl';

// A plain single-line field for sending commands, mainly for touch devices where typing into the terminal is not
// practical. Shown below the terminal when the command input is switched on in the widget toolbar.
class CommandInput extends PureComponent {
    static propTypes = {
      onSend: PropTypes.func.isRequired
    };

    state = {
      value: ''
    };

    handleChange = (event) => {
      this.setState({ value: event.target.value });
    };

    handleSubmit = (event) => {
      event.preventDefault();
      const command = this.state.value.trim();
      if (!command) {
        return;
      }
      this.props.onSend(command);
      this.setState({ value: '' });
    };

    render() {
      const { value } = this.state;

      return (
        <form className={styles.commandInput} onSubmit={this.handleSubmit}>
          <input
            type="text"
            className="form-control"
            value={value}
            onChange={this.handleChange}
            placeholder={i18n._('Enter a command')}
            aria-label={i18n._('Command')}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterkeyhint="send"
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!value.trim()}
          >
            {i18n._('Send')}
          </button>
        </form>
      );
    }
}

export default CommandInput;
