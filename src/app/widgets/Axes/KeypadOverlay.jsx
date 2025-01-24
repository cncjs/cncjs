import React from 'react';
import Space from 'app/components/Space';
import { Tooltip } from 'app/components/Tooltip';
import i18n from 'app/lib/i18n';

const keypadTooltip = () => {
  const styles = {
    tooltip: {
      fontFamily: 'Consolas, Menlo, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace, serif',
      padding: 5
    },
    container: {
      padding: 5
    },
    axisDirection: {
      marginRight: 10
    },
    divider: {
      borderTop: '1px solid #ccc',
      marginTop: 5,
      paddingTop: 5
    },
    kbd: {
      border: '1px solid #aaa',
      padding: '1px 4px',
      fontFamily: 'sans-serif',
      whiteSpace: 'nowrap'
    },
    icon: {
      minWidth: 10,
      textAlign: 'center'
    }
  };

  return (
    <div
      id="widget-axes-keypad-tooltip"
      style={styles.tooltip}
    >
      <div style={styles.container}>
        <div className="row no-gutters text-left">
          <div className="col-xs-12">
            <span style={styles.axisDirection}>X+</span>
            <kbd style={styles.kbd}>
              <i className="fa fa-angle-right" style={styles.icon} />
            </kbd>
            <Space width="8" />
            {i18n._('Right')}
          </div>
          <div className="col-xs-12">
            <span style={styles.axisDirection}>X-</span>
            <kbd style={styles.kbd}>
              <i className="fa fa-angle-left" style={styles.icon} />
            </kbd>
            <Space width="8" />
            {i18n._('Left')}
          </div>
          <div className="col-xs-12">
            <span style={styles.axisDirection}>Y+</span>
            <kbd style={styles.kbd}>
              <i className="fa fa-angle-up" style={styles.icon} />
            </kbd>
            <Space width="8" />
            {i18n._('Up')}
          </div>
          <div className="col-xs-12">
            <span style={styles.axisDirection}>Y-</span>
            <kbd style={styles.kbd}>
              <i className="fa fa-angle-down" style={styles.icon} />
            </kbd>
            <Space width="8" />
            {i18n._('Down')}
          </div>
          <div className="col-xs-12">
            <span style={styles.axisDirection}>Z+</span>
            <kbd style={styles.kbd}>
              <i className="fa fa-long-arrow-up" style={styles.icon} />
            </kbd>
            <Space width="8" />
            {i18n._('Page Up')}
          </div>
          <div className="col-xs-12">
            <span style={styles.axisDirection}>Z-</span>
            <kbd style={styles.kbd}>
              <i className="fa fa-long-arrow-down" style={styles.icon} />
            </kbd>
            <Space width="8" />
            {i18n._('Page Down')}
          </div>
          <div className="col-xs-12">
            <span style={styles.axisDirection}>A+</span>
            <kbd style={styles.kbd}>
              {' ] '}
            </kbd>
            <Space width="8" />
            {i18n._('Right Square Bracket')}
          </div>
          <div className="col-xs-12">
            <span style={styles.axisDirection}>A-</span>
            <kbd style={styles.kbd}>
              {' [ '}
            </kbd>
            <Space width="8" />
            {i18n._('Left Square Bracket')}
          </div>
        </div>
        <div className="row no-gutters">
          <div style={styles.divider} />
        </div>
        <div className="row no-gutters">
          <div className="col-xs-12">
            <div className="table-form">
              <div className="table-form-row table-form-row-dense">
                <div className="table-form-col table-form-col-label">{i18n._('0.1x Move')}</div>
                <div className="table-form-col">
                  <kbd style={styles.kbd}>{i18n._('Alt')}</kbd>
                </div>
              </div>
              <div className="table-form-row table-form-row-dense">
                <div className="table-form-col table-form-col-label">{i18n._('10x Move')}</div>
                <div className="table-form-col">
                  <kbd style={styles.kbd}>{i18n._('⇧ Shift')}</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default (props) => {
  const { show, children } = { ...props };

  if (!show) {
    return children;
  }

  return (
    <Tooltip
      content={keypadTooltip()}
      placement="bottom"
    >
      {children}
    </Tooltip>
  );
};
