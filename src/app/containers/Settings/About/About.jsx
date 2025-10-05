import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import AboutContainer from './AboutContainer';
import HelpContainer from './HelpContainer';
import CheckForUpdatesContainer from './CheckForUpdatesContainer';
import UpdateStatusContainer from './UpdateStatusContainer';

class About extends PureComponent {
    static propTypes = {
      initialState: PropTypes.object,
      state: PropTypes.object,
      stateChanged: PropTypes.bool,
      actions: PropTypes.object
    };

    componentDidMount() {
      const { actions } = this.props;
      actions.checkLatestVersion();
    }

    render() {
      const { state } = this.props;
      const { version } = state;

      return (
        <div>
          <AboutContainer version={version} />
          <HelpContainer />
          <CheckForUpdatesContainer />
          <UpdateStatusContainer
            checking={version.checking}
            current={version.current}
            latest={version.latest}
            lastUpdate={version.lastUpdate}
          />
        </div>
      );
    }
}

export default About;
