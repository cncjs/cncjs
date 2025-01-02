import get from 'lodash/get';
import classNames from 'classnames';
import { ensureNumber } from 'ensure-type';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Select from 'react-select';
import Image from 'app/components/Image';
import i18n from 'app/lib/i18n';
import {
  METRIC_UNITS
} from '../../constants';
import {
  TOOL_CHANGE_POLICY_SEND_M6_COMMANDS,
  TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS,
  TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS,
  TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO,
  TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM,
} from './constants';
import iconPin from './images/pin.svg';
import styles from './index.styl';

class Tool extends PureComponent {
  static propTypes = {
    state: PropTypes.object,
    actions: PropTypes.object
  };

  renderToolChangePolicy = (option) => {
    const style = {
      color: '#333',
      textOverflow: 'ellipsis',
      overflow: 'hidden'
    };
    return (
      <div style={style} title={option.label}>{option.label}</div>
    );
  };

  render() {
    const { state, actions } = this.props;
    const {
      canClick,
      units,
      toolConfig,
    } = state;
    const displayUnits = (units === METRIC_UNITS) ? i18n._('mm') : i18n._('in');
    const feedrateUnits = (units === METRIC_UNITS) ? i18n._('mm/min') : i18n._('in/min');
    const step = (units === METRIC_UNITS) ? 1 : 0.1;
    const canGetMachinePosition = canClick;

    if (!toolConfig) {
      return (
        <div className={styles.noData}>
          {i18n._('No available tool configuration')}
        </div>
      );
    }

    const toolChangePolicy = get(toolConfig, 'toolChangePolicy');
    const toolChangeX = get(toolConfig, 'toolChangeX');
    const toolChangeY = get(toolConfig, 'toolChangeY');
    const toolChangeZ = get(toolConfig, 'toolChangeZ');
    const toolProbeCommand = get(toolConfig, 'toolProbeCommand');
    const toolProbeDistance = get(toolConfig, 'toolProbeDistance');
    const toolProbeFeedrate = get(toolConfig, 'toolProbeFeedrate');
    const toolProbeX = get(toolConfig, 'toolProbeX');
    const toolProbeY = get(toolConfig, 'toolProbeY');
    const toolProbeZ = get(toolConfig, 'toolProbeZ');
    const touchPlateHeight = get(toolConfig, 'touchPlateHeight');
    const isManualToolChange = [
      TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS,
      TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO,
      TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM,
    ].includes(toolChangePolicy);
    const isProbingEnabledForManualToolChange = [
      TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS,
      TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO,
    ].includes(toolChangePolicy);

    return (
      <div>
        <div className="form-group">
          <label className="control-label">{i18n._('Tool Change Policy')}</label>
          <Select
            backspaceRemoves={false}
            className="sm"
            clearable={false}
            menuContainerStyle={{ zIndex: 5 }}
            name="toolChangePolicy"
            onChange={(option) => {
              const value = ensureNumber(option.value);
              actions.setToolChangePolicy(value);
            }}
            options={[
              {
                value: String(TOOL_CHANGE_POLICY_SEND_M6_COMMANDS),
                label: i18n._('Send M6 commands'),
              },
              {
                value: String(TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS),
                label: i18n._('Ignore M6 commands'),
              },
              {
                value: String(TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS),
                label: i18n._('Manual Tool Change (WCS)'),
              },
              {
                value: String(TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO),
                label: i18n._('Manual Tool Change (TLO)'),
              },
              {
                value: String(TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM),
                label: i18n._('Manual Tool Change (Custom)'),
              },
            ]}
            searchable={false}
            value={toolChangePolicy}
            valueRenderer={this.renderToolChangePolicy}
          />
          {toolChangePolicy === TOOL_CHANGE_POLICY_SEND_M6_COMMANDS &&
            <p style={{ marginTop: 4 }}>
              <i>{i18n._('This will send the line exactly as it is to the controller.')}</i>
            </p>
          }
          {toolChangePolicy === TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS &&
            <p style={{ marginTop: 4 }}>
              <i>{i18n._('This will completely skip the M6 command and prevent it from being sent to the controller.')}</i>
            </p>
          }
        </div>
        {isManualToolChange && (
          <div>
            <div className="form-group">
              <label className="control-label">
                {i18n._('Tool Change Position')}
              </label>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  rowGap: 8,
                }}
              >
                {['x', 'y', 'z'].map(axis => {
                  const axisLabel = {
                    x: 'X',
                    y: 'Y',
                    z: 'Z',
                  }[axis];
                  const toolChangeAxisValue = {
                    x: toolChangeX,
                    y: toolChangeY,
                    z: toolChangeZ,
                  }[axis];

                  return (
                    <div
                      key={axis}
                      style={{ display: 'flex', columnGap: 8 }}
                    >
                      <div className="input-group input-group-sm">
                        <div className="input-group-addon">
                          {axisLabel}
                        </div>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="0.00"
                          onChange={(event) => {
                            const value = event.target.value;
                            actions.setToolChangePosition({ [axis]: value });
                          }}
                          value={toolChangeAxisValue}
                        />
                        <div className="input-group-addon">{displayUnits}</div>
                      </div>
                      <button
                        type="button"
                        disabled={!canGetMachinePosition}
                        onClick={() => {
                          const value = state.machinePosition?.[axis];
                          if (value !== undefined) {
                            actions.setToolChangePosition({ [axis]: value });
                          }
                        }}
                        className="btn btn-default"
                        style={{ padding: '4px 8px' }}
                        title={i18n._('Use the current machine position as the tool change position.')}
                      >
                        <Image src={iconPin} width="14" height="14" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            {isProbingEnabledForManualToolChange && (
              <div>
                <div className="form-group">
                  <label className="control-label">
                    {i18n._('Probe Position')}
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      rowGap: 8,
                    }}
                  >
                    {['x', 'y', 'z'].map(axis => {
                      const axisLabel = {
                        x: 'X',
                        y: 'Y',
                        z: 'Z',
                      }[axis];
                      const toolProbeAxisValue = {
                        x: toolProbeX,
                        y: toolProbeY,
                        z: toolProbeZ,
                      }[axis];

                      return (
                        <div
                          key={axis}
                          style={{ display: 'flex', columnGap: 8 }}
                        >
                          <div className="input-group input-group-sm">
                            <div className="input-group-addon">
                              {axisLabel}
                            </div>
                            <input
                              type="number"
                              className="form-control"
                              placeholder="0.00"
                              onChange={(event) => {
                                const value = event.target.value;
                                actions.setToolProbePosition({ [axis]: value });
                              }}
                              value={toolProbeAxisValue}
                            />
                            <div className="input-group-addon">{displayUnits}</div>
                          </div>
                          <button
                            type="button"
                            disabled={!canGetMachinePosition}
                            onClick={() => {
                              const value = state.machinePosition?.[axis];
                              if (value !== undefined) {
                                actions.setToolProbePosition({ [axis]: value });
                              }
                            }}
                            className="btn btn-default"
                            style={{ padding: '4px 8px' }}
                            title={i18n._('Use the current machine position as the tool probe position.')}
                          >
                            <Image src={iconPin} width="14" height="14" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="form-group">
                  <label className="control-label">
                    {i18n._('Probe Command')}
                  </label>
                  <div className="btn-toolbar" role="toolbar" style={{ marginBottom: 5 }}>
                    <div className="btn-group btn-group-sm">
                      <button
                        type="button"
                        className={classNames(
                          'btn',
                          'btn-default',
                          { 'btn-select': toolProbeCommand === 'G38.2' }
                        )}
                        title={i18n._('G38.2 probe toward workpiece, stop on contact, signal error if failure')}
                        onClick={() => actions.setToolProbeCommand('G38.2')}
                      >
                        G38.2
                      </button>
                      <button
                        type="button"
                        className={classNames(
                          'btn',
                          'btn-default',
                          { 'btn-select': toolProbeCommand === 'G38.3' }
                        )}
                        title={i18n._('G38.3 probe toward workpiece, stop on contact')}
                        onClick={() => actions.setToolProbeCommand('G38.3')}
                      >
                        G38.3
                      </button>
                      <button
                        type="button"
                        className={classNames(
                          'btn',
                          'btn-default',
                          { 'btn-select': toolProbeCommand === 'G38.4' }
                        )}
                        title={i18n._('G38.4 probe away from workpiece, stop on loss of contact, signal error if failure')}
                        onClick={() => actions.setToolProbeCommand('G38.4')}
                      >
                        G38.4
                      </button>
                      <button
                        type="button"
                        className={classNames(
                          'btn',
                          'btn-default',
                          { 'btn-select': toolProbeCommand === 'G38.5' }
                        )}
                        title={i18n._('G38.5 probe away from workpiece, stop on loss of contact')}
                        onClick={() => actions.setToolProbeCommand('G38.5')}
                      >
                        G38.5
                      </button>
                    </div>
                  </div>
                  {toolProbeCommand === 'G38.2' &&
                    <p style={{ marginTop: 4 }}>
                      <i>{i18n._('G38.2 probe toward workpiece, stop on contact, signal error if failure')}</i>
                    </p>
                  }
                  {toolProbeCommand === 'G38.3' &&
                    <p style={{ marginTop: 4 }}>
                      <i>{i18n._('G38.3 probe toward workpiece, stop on contact')}</i>
                    </p>
                  }
                  {toolProbeCommand === 'G38.4' &&
                    <p style={{ marginTop: 4 }}>
                      <i>{i18n._('G38.4 probe away from workpiece, stop on loss of contact, signal error if failure')}</i>
                    </p>
                  }
                  {toolProbeCommand === 'G38.5' &&
                    <p style={{ marginTop: 4 }}>
                      <i>{i18n._('G38.5 probe away from workpiece, stop on loss of contact')}</i>
                    </p>
                  }
                </div>
                <div className="row no-gutters">
                  <div className="col-xs-6" style={{ paddingRight: 5 }}>
                    <div className="form-group">
                      <label className="control-label">{i18n._('Probe Distance')}</label>
                      <div className="input-group input-group-sm">
                        <input
                          type="number"
                          className="form-control"
                          value={toolProbeDistance}
                          placeholder="0.00"
                          min={0}
                          step={step}
                          onChange={(event) => {
                            const value = event.target.value;
                            actions.setToolProbeDistance(value);
                          }}
                        />
                        <div className="input-group-addon">{displayUnits}</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-xs-6" style={{ paddingLeft: 5 }}>
                    <div className="form-group">
                      <label className="control-label">{i18n._('Probe Feedrate')}</label>
                      <div className="input-group input-group-sm">
                        <input
                          type="number"
                          className="form-control"
                          value={toolProbeFeedrate}
                          placeholder="0.00"
                          min={0}
                          step={step}
                          onChange={(event) => {
                            const value = event.target.value;
                            actions.setToolProbeFeedrate(value);
                          }}
                        />
                        <span className="input-group-addon">{feedrateUnits}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row no-gutters">
                  <div className="col-xs-6" style={{ paddingRight: 5 }}>
                    <div className="form-group">
                      <label className="control-label">{i18n._('Touch Plate Height')}</label>
                      <div className="input-group input-group-sm">
                        <input
                          type="number"
                          className="form-control"
                          value={touchPlateHeight}
                          placeholder="0.00"
                          min={0}
                          step={step}
                          onChange={(event) => {
                            const value = event.target.value;
                            actions.setTouchPlateHeight(value);
                          }}
                        />
                        <span className="input-group-addon">{displayUnits}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}

export default Tool;
