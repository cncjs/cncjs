import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import Panel from '../../components/Panel';
import i18n from '../../lib/i18n';
import { formatBytes } from '../../lib/numeral';
import styles from './index.styl';

const none = '–';

class Dashboard extends Component {
    static propTypes = {
        show: PropTypes.bool,
        state: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        const { show, state } = this.props;

        if (!show) {
            return null;
        }

        return (
            <Panel className={styles.dashboard}>
                <Panel.Heading>
                    {i18n._('G-code')}
                </Panel.Heading>
                <Panel.Body>
                    <div className="row no-gutters">
                        <div className="col col-xs-4">{i18n._('Name')}</div>
                        <div className="col col-xs-8">
                            <div className={styles.well}>{state.gcode.ready ? state.gcode.name : none}</div>
                        </div>
                    </div>
                    <div className="row no-gutters">
                        <div className="col col-xs-4">{i18n._('Size')}</div>
                        <div className="col col-xs-8">
                            <div className={styles.well}>{state.gcode.ready ? formatBytes(state.gcode.size, 1) : none}</div>
                        </div>
                    </div>
                    <div className="row no-gutters">
                        <div className="col col-xs-4">{i18n._('Sent')}</div>
                        <div className="col col-xs-8">
                            <div className={styles.well}>{state.gcode.ready ? state.gcode.sent : none}</div>
                        </div>
                    </div>
                    <div className="row no-gutters">
                        <div className="col col-xs-4">{i18n._('Total')}</div>
                        <div className="col col-xs-8">
                            <div className={styles.well}>{state.gcode.ready ? state.gcode.total : none}</div>
                        </div>
                    </div>
                </Panel.Body>
            </Panel>
        );
    }
}

export default Dashboard;
