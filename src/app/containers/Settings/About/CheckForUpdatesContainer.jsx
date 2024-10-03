import React, { PureComponent } from 'react';
import api from 'app/api';
import ToggleSwitch from 'app/components/ToggleSwitch';
import i18n from 'app/lib/i18n';

class CheckForUpdatesContainer extends PureComponent {
  state = {
    checkForUpdates: null,
  };

  actions = {
    queryCheckForUpdates: async () => {
      const res = await api.getState();
      const { checkForUpdates } = res.body;
      this.setState({
        checkForUpdates: checkForUpdates,
      });
    },
    mutateCheckForUpdates: async (value) => {
      await api.setState({ checkForUpdates: value });
    },
    changeLanguage: (event) => {
      const { actions } = this.props;
      const target = event.target;
      actions.changeLanguage(target.value);
    },
  };

  componentDidMount() {
    this.actions.queryCheckForUpdates();
  }

  render() {
    if (this.state.checkForUpdates === null) {
      return null;
    }

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <label>
          <ToggleSwitch
            checked={this.state.checkForUpdates}
            size="sm"
            onChange={async () => {
              const nextValue = !this.state.checkForUpdates;
              await this.actions.mutateCheckForUpdates(nextValue);
              await this.actions.queryCheckForUpdates();
            }}
          />
          {i18n._('Automatically check for updates')}
        </label>
      </div>
    );
  }
}

export default CheckForUpdatesContainer;
