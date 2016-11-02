import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import AboutContainer from './AboutContainer';
import HelpContainer from './HelpContainer';
import UpdateStatusContainer from './UpdateStatusContainer';

class About extends Component {
    static propTypes = {
        state: PropTypes.object,
        stateChanged: PropTypes.bool,
        actions: PropTypes.object
    };

    componentDidMount() {
        const { actions } = this.props;
        actions.checkLatestVersion();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        const { state } = this.props;
        const { version } = state;

        return (
            <div>
                <AboutContainer title={`cnc ${version.current}`} />
                <HelpContainer />
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
