import React from 'react';
import serialport from '../../../lib/serialport';
import JogDistanceControl from './JogDistanceControl';
import JogJoystickControl from './JogJoystickControl';
import {
    ACTIVE_STATE_IDLE,
    DISTANCE_DEFAULT
} from './constants';

class JogControlPanel extends React.Component {
    state = {
        distance: DISTANCE_DEFAULT
    };
    static propTypes = {
        port: React.PropTypes.string,
        unit: React.PropTypes.string,
        activeState: React.PropTypes.string
    };

    changeDistance(distance) {
        this.setState({ distance: Number(distance) || DISTANCE_DEFAULT });
    }
    render() {
        let { port, unit, activeState } = this.props;
        let { distance } = this.state;
        let canClick = (!!port && (activeState === ACTIVE_STATE_IDLE));
        let styles = {
            jogJoystickControl: {
            },
            jogDistanceControl: {
                marginLeft: 10,
                marginBottom: 15
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
                                distance={distance}
                            />
                        </div>
                    </div>
                    <div className="col-sm-6">
                        <div style={styles.jogDistanceControl}>
                            <JogDistanceControl unit={unit} onChange={::this.changeDistance} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default JogControlPanel;
