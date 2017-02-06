import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import { ProgressBar } from 'react-bootstrap';
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

            return i18n._('G-code not loaded');
        }(state));
        const filesize = state.gcode.ready ? formatBytes(state.gcode.size, 0) : '';
        const { sent = 0, total = 0 } = state.gcode;

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
                    <ProgressBar
                        style={{ marginBottom: 0 }}
                        bsStyle="info"
                        min={0}
                        max={total}
                        now={sent}
                        label={total > 0 &&
                            <span className={styles.progressbarLabel}>
                                {sent}&nbsp;/&nbsp;{total}
                            </span>
                        }
                    />
                </Panel.Body>
            </Panel>
        );
    }
}

export default Dashboard;
