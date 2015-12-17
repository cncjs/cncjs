import React from 'react';
import serialport from '../../../lib/serialport';
import JogDistanceControl from './JogDistanceControl';
import JogFeedrateControl from './JogFeedrateControl';
import JogJoystickControl from './JogJoystickControl';
import {
    ACTIVE_STATE_RUN,
    DISTANCE_DEFAULT,
    FEEDRATE_DEFAULT
} from './constants';

class JogControlPanel extends React.Component {
    state = {
        feedrate: FEEDRATE_DEFAULT,
        distance: DISTANCE_DEFAULT
    };
    static propTypes = {
        port: React.PropTypes.string,
        unit: React.PropTypes.string,
        activeState: React.PropTypes.string
    };

    changeFeedrate(feedrate) {
        this.setState({ feedrate: feedrate });
    }
    changeDistance(distance) {
        this.setState({ distance: distance });
    }
    render() {
        let { port, unit, activeState } = this.props;
        let { feedrate, distance } = this.state;
        let canClick = (!!port && (activeState !== ACTIVE_STATE_RUN));
        let styles = {
            jogJoystickControl: {
            },
            jogDistanceControl: {
                marginLeft: 10,
                marginBottom: 15
            },
            jogFeedrateControl: {
                marginLeft: 10,
                marginBottom: 0
            }
        };

        return (
            <div className="container-fluid control-panel">
                <div className="row no-gutter">
                    <div className="col-sm-6">
                        <div style={styles.jogJoystickControl}>
                            <JogJoystickControl
                                port={port}
                                unit={unit}
                                activeState={activeState}
                                feedrate={feedrate}
                                distance={distance}
                            />
                        </div>
                    </div>
                    <div className="col-sm-6">
                        <div style={styles.jogDistanceControl}>
                            <JogDistanceControl onChange={::this.changeDistance} />
                        </div>
                        <div style={styles.jogFeedrateControl}>
                            <JogFeedrateControl onChange={::this.changeFeedrate} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default JogControlPanel;
