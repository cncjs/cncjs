import cx from 'classnames';
import escape from 'lodash/escape';
import get from 'lodash/get';
import throttle from 'lodash/throttle';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import { ProgressBar } from 'react-bootstrap';
import VirtualList from 'react-tiny-virtual-list';
import api from 'app/api';
import Anchor from 'app/components/Anchor';
import Panel from 'app/components/Panel';
import i18n from 'app/lib/i18n';
import { formatBytes } from 'app/lib/numeral';
import styles from './dashboard.styl';

class Dashboard extends PureComponent {
    static propTypes = {
        show: PropTypes.bool,
        state: PropTypes.object
    };

    node = {
        virtualList: null
    };

    state = {
        virtualList: {
            visibleHeight: 0
        }
    };

    lines = [];

    renderItem = ({ index, style }) => (
        <div key={index} style={style}>
            <div className={styles.line}>
                <span className={cx(styles.label, styles.labelDefault)}>
                    {index + 1}
                </span>
                {escape(this.lines[index])}
            </div>
        </div>
    );

    resizeVirtualList = throttle(() => {
        if (!this.node.virtualList) {
            return;
        }

        const el = ReactDOM.findDOMNode(this.node.virtualList);
        const clientHeight = Number(el.clientHeight) || 0;

        if (clientHeight > 0) {
            this.setState(state => ({
                virtualList: {
                    ...state.virtualList,
                    visibleHeight: el.clientHeight
                }
            }));
        }
    }, 32); // 60hz

    componentDidMount() {
        this.resizeVirtualList();
        window.addEventListener('resize', this.resizeVirtualList);
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.resizeVirtualList);
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.state.gcode.content !== this.props.state.gcode.content) {
            this.lines = get(nextProps, 'state.gcode.content', '')
                .split('\n')
                .filter(line => line.trim().length > 0);
        }
    }

    componentDidUpdate(prevProps) {
        if ((this.props.show !== prevProps.show) && this.props.show) {
            this.resizeVirtualList();
        }
    }

    render() {
        const { show, state } = this.props;
        const style = {
            display: show ? 'block' : 'none'
        };
        const filename = state.gcode.name || 'noname.nc';
        const filesize = state.gcode.ready ? formatBytes(state.gcode.size, 0) : '';
        const { sent = 0, total = 0 } = state.gcode;
        const { virtualList } = this.state;
        const rowHeight = 20;

        return (
            <Panel
                className={cx(styles.dashboard)}
                style={style}
            >
                <Panel.Heading style={{ height: 30 }}>
                    {i18n._('G-code')}
                </Panel.Heading>
                <Panel.Body
                    style={{ height: 'calc(100% - 30px)' }}
                >
                    <div className="clearfix" style={{ marginBottom: 10 }}>
                        <div className="pull-left text-nowrap">
                            {state.gcode.ready && (
                                <Anchor
                                    onClick={() => {
                                        api.downloadGCode({ port: state.port });
                                    }}
                                >
                                    <strong>{filename}</strong>
                                </Anchor>
                            )}
                            {!state.gcode.ready && i18n._('G-code not loaded')}
                        </div>
                        <div className="pull-right text-nowrap">
                            {filesize}
                        </div>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                        <div className="text-nowrap">
                            {i18n._('Program Message')}: {state.gcode.message || (<i>({i18n._('none')})</i>)}
                        </div>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                        <ProgressBar
                            style={{ marginBottom: 0 }}
                            bsStyle="info"
                            min={0}
                            max={total}
                            now={sent}
                            label={total > 0 && (
                                <span className={styles.progressbarLabel}>
                                    {sent}&nbsp;/&nbsp;{total}
                                </span>
                            )}
                        />
                    </div>
                    <div
                        ref={node => {
                            this.node.virtualList = node;
                        }}
                        className={cx(
                            styles.gcodeViewer,
                            { [styles.gcodeViewerDisabled]: this.lines.length === 0 }
                        )}
                    >
                        {this.lines.length > 0 && (
                            <VirtualList
                                width="100%"
                                height={virtualList.visibleHeight}
                                style={{
                                    padding: '0 5px'
                                }}
                                itemCount={this.lines.length}
                                itemSize={rowHeight}
                                renderItem={this.renderItem}
                                scrollToIndex={sent}
                            />
                        )}
                        {this.lines.length === 0 && (
                            <div className={styles.absoluteCenter}>
                                <img src="images/logo-square-256x256.png" alt="" />
                            </div>
                        )}
                    </div>
                </Panel.Body>
            </Panel>
        );
    }
}

export default Dashboard;
