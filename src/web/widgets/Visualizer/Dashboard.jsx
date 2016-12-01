import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import Anchor from '../../components/Anchor';
import Panel from '../../components/Panel';
import i18n from '../../lib/i18n';
import { formatBytes } from '../../lib/numeral';
import styles from './index.styl';

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

        const none = '–';
        const filename = (function(state) {
            if (state.gcode.ready) {
                const url = `api/gcode/download?port=${state.port}`;
                const defaultName = 'noname.nc';
                return (
                    <Anchor href={url}>
                        <strong>{state.gcode.name || defaultName}</strong>
                    </Anchor>
                );
            }

            return (
                <span className={styles['text-gray']}>
                    {i18n._('G-code not loaded')}
                </span>
            );
        }(state));
        const filesize = (
            <span className={styles['text-gray']}>
                {state.gcode.ready ? formatBytes(state.gcode.size, 0) : ''}
            </span>
        );
        const sent = state.gcode.ready ? state.gcode.sent : none;
        const total = state.gcode.ready ? state.gcode.total : none;

        return (
            <Panel className={styles.dashboard}>
                <Panel.Heading>
                    {i18n._('G-code')}
                </Panel.Heading>
                <Panel.Body>
                    <div className="row no-gutters">
                        <div className="col col-xs-10">
                            <div className="pull-left">
                                {filename}
                            </div>
                        </div>
                        <div className="col col-xs-2">
                            <div className="pull-right">
                                {filesize}
                            </div>
                        </div>
                    </div>
                    <div className={styles.divider} />
                    <div className="row no-gutters">
                        <div className="col col-xs-4">{i18n._('Sent')}</div>
                        <div className="col col-xs-8">
                            <div className={styles.well}>{sent}</div>
                        </div>
                    </div>
                    <div className="row no-gutters">
                        <div className="col col-xs-4">{i18n._('Total')}</div>
                        <div className="col col-xs-8">
                            <div className={styles.well}>{total}</div>
                        </div>
                    </div>
                </Panel.Body>
            </Panel>
        );
    }
}

export default Dashboard;
