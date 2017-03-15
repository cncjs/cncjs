import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import { ProgressBar } from 'react-bootstrap';
import Anchor from '../../components/Anchor';
import Panel from '../../components/Panel';
import Clusterize from '../../components/Clusterize';
import i18n from '../../lib/i18n';
import { formatBytes } from '../../lib/numeral';
import styles from './dashboard.styl';

class Dashboard extends Component {
    static propTypes = {
        show: PropTypes.bool,
        state: PropTypes.object
    };

    lines = [];

    componentWillReceiveProps(nextProps) {
        if (nextProps.state.gcode.content !== this.props.state.gcode.content) {
            this.lines = nextProps.state.gcode.content.split('\n')
                .filter(line => line.trim().length > 0)
                .map((line, index) => (
                `<div class="${styles.line}"><span class="${styles.label} ${styles.labelDefault}">${index + 1}</span> ${line}</div>`
            ));
        }
    }
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
        const rowHeight = 20;
        const scrollTop = (sent > 0) ? (sent - 1) * rowHeight : 0;

        return (
            <Panel className={styles.dashboard}>
                <Panel.Heading>
                    {i18n._('G-code')}
                </Panel.Heading>
                <Panel.Body>
                    <div className="clearfix" style={{ marginBottom: 10 }}>
                        <div className="pull-left text-nowrap">
                            {filename}
                        </div>
                        <div className="pull-right text-nowrap">
                            {filesize}
                        </div>
                    </div>
                    <div style={{ marginBottom: 10 }}>
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
                    </div>
                    <div
                        className={classNames(
                            styles.gcodeViewer,
                            { [styles.gcodeViewerDisabled]: this.lines.length === 0 }
                        )}
                    >
                        {this.lines.length > 0 &&
                        <Clusterize
                            style={{ padding: '0 5px' }}
                            rows={this.lines}
                            scrollTop={scrollTop}
                        />
                        }
                        {this.lines.length === 0 &&
                        <div className={styles.absoluteCenter}>
                            <img src="images/logo-square-256x256.png" role="presentation" />
                        </div>
                        }
                    </div>
                </Panel.Body>
            </Panel>
        );
    }
}

export default Dashboard;
