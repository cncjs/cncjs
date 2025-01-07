import get from 'lodash/get';
import classNames from 'classnames';
import { ensureNumber } from 'ensure-type';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Select from 'react-select';
import styled from 'styled-components';
import Image from 'app/components/Image';
import { Tooltip } from 'app/components/Tooltip';
import i18n from 'app/lib/i18n';
import {
  GRBL,
  MARLIN,
  SMOOTHIE,
  TINYG,
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

const copyToClipboard = value => {
  const el = document.createElement('textarea');
  el.value = value;
  el.setAttribute('readonly', '');
  el.style.position = 'absolute';
  el.style.left = '-9999px';
  document.body.appendChild(el);

  const selected =
    document.getSelection().rangeCount > 0
      ? document.getSelection().getRangeAt(0)
      : false;
  el.select();

  document.execCommand('copy');
  document.body.removeChild(el);

  if (selected) {
    document.getSelection().removeAllRanges();
    document.getSelection().addRange(selected);
  }
};

const IconButton = styled('button')`
  appearance: none;
  display: inline-block;
  font-weight: normal;
  text-align: center;
  white-space: nowrap;
  touch-action: manipulation;
  cursor: pointer;
  user-select: none;
  background: none;
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 24px;
  filter: invert(40%);
  &:hover {
    filter: none;
  }
`;

class Tool extends PureComponent {
  static propTypes = {
    state: PropTypes.object,
    actions: PropTypes.object
  };

  timer = null;

  state = {
    isToolProbeCommandsCopied: false,
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
    const controllerType = state.controller.type;
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
    const toolProbeX = get(toolConfig, 'toolProbeX');
    const toolProbeY = get(toolConfig, 'toolProbeY');
    const toolProbeZ = get(toolConfig, 'toolProbeZ');
    const toolProbeOverrides = get(toolConfig, 'toolProbeOverrides');
    const toolProbeCommand = get(toolConfig, 'toolProbeCommand');
    const toolProbeDistance = get(toolConfig, 'toolProbeDistance');
    const toolProbeFeedrate = get(toolConfig, 'toolProbeFeedrate');
    const touchPlateHeight = get(toolConfig, 'touchPlateHeight');
    const isManualToolChange = [
      TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS,
      TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO,
      TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM,
    ].includes(toolChangePolicy);
    const isToolProbeOverrides = (toolChangePolicy === TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM);

    const toolProbeCommands = (() => {
      const lines = [];

      if (controllerType === MARLIN) {
        lines.push('; Probe the tool');
        lines.push('G91 [tool_probe_command] F[tool_probe_feedrate] Z[tool_probe_z - posz - tool_probe_distance]');
        if (toolChangePolicy === TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS) {
          lines.push('; Set the current work Z position (posz) to the touch plate height');
          lines.push('G92 Z[touch_plate_height]');
        } else if (toolChangePolicy === TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO) {
          lines.push('; Pause for 1 second');
          lines.push('%wait 1');
          lines.push('; Adjust the work Z position by subtracting the touch plate height from the current work Z position (posz)');
          lines.push('G92 Z[posz - touch_plate_height]');
        }
        return lines;
      }

      if (controllerType === GRBL || controllerType === SMOOTHIE) {
        lines.push('; Probe the tool');
        lines.push('G91 [tool_probe_command] F[tool_probe_feedrate] Z[tool_probe_z - mposz - tool_probe_distance]');
        if (toolChangePolicy === TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS) {
          lines.push('; Set coordinate system offset');
          lines.push('G10 L20 P[mapWCSToPValue(modal.wcs)] Z[touch_plate_height]');
        } else if (toolChangePolicy === TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO) {
          lines.push('; Pause for 1 second');
          lines.push('%wait 1');
          lines.push('; Set tool length offset');
          lines.push('G43.1 Z[posz - touch_plate_height]');
        }
        return lines;
      }

      if (controllerType === TINYG) {
        lines.push('; Probe the tool');
        lines.push('G91 [tool_probe_command] F[tool_probe_feedrate] Z[tool_probe_z - mposz - tool_probe_distance]');
        if (toolChangePolicy === TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS) {
          lines.push('; Set coordinate system offset');
          lines.push('G10 L20 P[mapWCSToPValue(modal.wcs)] Z[touch_plate_height]');
        } else if (toolChangePolicy === TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO) {
          lines.push('; Pause for 1 second');
          lines.push('%wait 1');
          lines.push('; Set tool length offset');
          lines.push('{tofz:[posz - touch_plate_height]}');
        }
        return lines;
      }

      return lines;
    })();

    const handleClickCopyToolProbeCommands = (event) => {
      copyToClipboard(toolProbeCommands);
      this.setState({ isToolProbeCommandsCopied: true });

      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }

      this.timer = setTimeout(() => {
        this.setState({ isToolProbeCommandsCopied: false });
      }, 1500);
    };

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
            <div className="form-group">
              <label className="control-label">
                {i18n._('Tool Probe Position')}
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
            {isToolProbeOverrides && (
              <div>
                <label className="control-label">
                  {i18n._('Tool Probe Overrides')}
                </label>
                <textarea
                  className="form-control"
                  style={{
                    whiteSpace: 'pre',
                    overflowWrap: 'normal',
                    minHeight: 120,
                    maxHeight: 180,
                    resize: 'vertical',
                    overflow: 'auto',
                  }}
                  value={toolProbeOverrides}
                  onChange={(event) => {
                    const value = event.target.value;
                    actions.setToolProbeOverrides(value);
                  }}
                />
              </div>
            )}
            {!isToolProbeOverrides && (
              <div>
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
                {!!controllerType && (
                  // Establish a connection to the controller to view the preview commands
                  <div>
                    <div style={{ display: 'flex', columnGap: 16 }}>
                      <label className="control-label">
                        {i18n._('Tool Probe Commands')}
                      </label>
                      <Tooltip
                        placement="bottom"
                        content={this.state.isToolProbeCommandsCopied ? i18n._('Copied') : i18n._('Copy')}
                        onMouseLeave={() => {
                          this.setState({ isToolProbeCommandsCopied: false });
                        }}
                      >
                        <IconButton
                          onClick={handleClickCopyToolProbeCommands}
                        >
                          <i className="fa fa-copy" />
                        </IconButton>
                      </Tooltip>
                    </div>
                    <pre
                      style={{
                        minHeight: 120,
                        maxHeight: 180,
                        resize: 'vertical',
                        overflow: 'auto',
                      }}
                    >
                      <code style={{ whiteSpace: 'pre' }}>
                        {toolProbeCommands}
                      </code>
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}

export default Tool;
