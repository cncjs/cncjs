import get from 'lodash/get';
import classNames from 'classnames';
import { ensureNumber, ensureString } from 'ensure-type';
import uniqueId from 'lodash/uniqueId';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import Select from 'react-select';
import styled from 'styled-components';
import { Button } from 'app/components/Buttons';
import Dropdown, { MenuItem } from 'app/components/Dropdown';
import Image from 'app/components/Image';
import { Tooltip } from 'app/components/Tooltip';
import i18n from 'app/lib/i18n';
import { mapValueToUnits } from 'app/lib/units';
import {
  GRBL,
  MARLIN,
  SMOOTHIE,
  TINYG,
  METRIC_UNITS
} from '../../constants';
import {
  TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS,
  TOOL_CHANGE_POLICY_SEND_M6_COMMANDS,
  TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS,
  TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO,
  TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING,
} from './constants';
import iconPin from './images/pin.svg';
import styles from './index.styl';
import insertAtCaret from './insertAtCaret';
import variables from './variables';

const TOOL_PROBE_OVERRIDE_WCS_EXAMPLE = `
; Probe the tool
G91 [tool_probe_command] F[tool_probe_feedrate] Z[tool_probe_z - mposz - tool_probe_distance]
; Set coordinate system offset
G10 L20 P[mapWCSToPValue(modal.wcs)] Z[touch_plate_height]
`.trim();

const TOOL_PROBE_OVERRIDE_TLO_EXAMPLE = `
; Probe the tool
G91 [tool_probe_command] F[tool_probe_feedrate] Z[tool_probe_z - mposz - tool_probe_distance]
; Pause for 1 second
%wait 1
; Set tool length offset
G43.1 Z[posz - touch_plate_height]
`.trim();

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

const TextPreview = styled('div')`
  font-family: "Segoe UI Mono", "SFMono-Medium", "SF Mono", Menlo, Consolas, Courier, monospace;
  font-size: 13px;
  line-height: 18px;
  overflow: auto;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  white-space: pre;
`;

const TextEditable = styled('textarea')`
  font-family: "Segoe UI Mono", "SFMono-Medium", "SF Mono", Menlo, Consolas, Courier, monospace;
  font-size: 13px;
  line-height: 18px;
  padding: 8px;
  background: none;
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow-wrap: normal;
  white-space: pre;
  width: 100%;
`;

class Tool extends PureComponent {
  static propTypes = {
    state: PropTypes.object,
    actions: PropTypes.object
  };

  fields = {
    toolProbeCustomCommands: null,
  };

  timer = null;

  state = {
    toolProbeCustomCommands: '',
    isToolProbeCustomCommandsEditable: false,
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

  componentDidUpdate(prevProps, prevState) {
    const prevToolProbeCustomCommands = get(prevProps.state.toolConfig, 'toolProbeCustomCommands');
    const toolProbeCustomCommands = get(this.props.state.toolConfig, 'toolProbeCustomCommands');

    if ((prevToolProbeCustomCommands !== toolProbeCustomCommands) && (toolProbeCustomCommands !== this.state.toolProbeCustomCommands)) {
      this.setState({ toolProbeCustomCommands });
    }
  }

  render() {
    const { state, actions } = this.props;
    const {
      canClick,
      controller,
      isReady,
      units,
      toolConfig,
    } = state;
    const displayUnits = (units === METRIC_UNITS) ? i18n._('mm') : i18n._('in');
    const feedrateUnits = (units === METRIC_UNITS) ? i18n._('mm/min') : i18n._('in/min');
    const step = (units === METRIC_UNITS) ? 1 : (1 / 16);
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
    const toolProbeCustomCommands = get(toolConfig, 'toolProbeCustomCommands');
    const toolProbeCommand = get(toolConfig, 'toolProbeCommand');
    const toolProbeDistance = get(toolConfig, 'toolProbeDistance');
    const toolProbeFeedrate = get(toolConfig, 'toolProbeFeedrate');
    const touchPlateHeight = get(toolConfig, 'touchPlateHeight');
    const isManualToolChange = [
      TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS,
      TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO,
      TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING,
    ].includes(toolChangePolicy);
    const isToolProbeDefaultView = [
      TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS,
      TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO,
    ].includes(toolChangePolicy);
    const isToolProbeCustomCommandsView = (toolChangePolicy === TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING);

    const toolProbeCommands = (() => {
      const lines = [];

      if (controller.type === MARLIN) {
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
        return lines.join('\n');
      }

      if (controller.type === GRBL || controller.type === SMOOTHIE) {
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
        return lines.join('\n');
      }

      if (controller.type === TINYG) {
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
        return lines.join('\n');
      }

      return lines.join('\n');
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
                value: String(TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS),
                label: i18n._('Ignore M6 commands (Default)'),
              },
              {
                value: String(TOOL_CHANGE_POLICY_SEND_M6_COMMANDS),
                label: i18n._('Send M6 commands'),
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
                value: String(TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING),
                label: i18n._('Manual Tool Change (Custom Probing)'),
              },
            ]}
            searchable={false}
            value={toolChangePolicy}
            valueRenderer={this.renderToolChangePolicy}
          />
          {toolChangePolicy === TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS &&
            <p style={{ marginTop: 4 }}>
              <i>{i18n._('This option skips the M6 command and pauses controller operations, giving you full manual control over the tool change process.')}</i>
            </p>
          }
          {toolChangePolicy === TOOL_CHANGE_POLICY_SEND_M6_COMMANDS &&
            <p style={{ marginTop: 4 }}>
              <i>{i18n._('This will send the line exactly as it is to the controller.')}</i>
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
            {isToolProbeCustomCommandsView && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    columnGap: 8,
                    alignItems: 'center',
                  }}
                >
                  <label className="control-label">
                    {i18n._('Custom Tool Probe Commands')}
                  </label>
                  {!this.state.isToolProbeCustomCommandsEditable && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: 5,
                      }}
                    >
                      <Tooltip
                        placement="bottom"
                        content={i18n._('Edit')}
                      >
                        <IconButton
                          onClick={() => {
                            this.setState({ isToolProbeCustomCommandsEditable: true });
                          }}
                        >
                          <i className="fa fa-fw fa-edit" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  )}
                </div>
                {this.state.isToolProbeCustomCommandsEditable && (
                  <div
                    style={{
                      marginBottom: 8,
                    }}
                  >
                    <Dropdown
                      onSelect={(eventKey) => {
                        const el = ReactDOM.findDOMNode(this.fields.toolProbeCustomCommands);
                        if (el) {
                          insertAtCaret(el, eventKey);
                        }
                      }}
                    >
                      <Tooltip
                        placement="bottom"
                        content={i18n._('Import predefined tool probe commands to update the Z-axis offset in the Work Coordinate System (WCS)')}
                      >
                        <Button
                          btnSize="xs"
                          btnStyle="flat"
                          style={{
                            minWidth: 'auto',
                          }}
                          onClick={() => {
                            const value = TOOL_PROBE_OVERRIDE_WCS_EXAMPLE;
                            this.setState({ toolProbeCustomCommands: value });
                          }}
                        >
                          <i className="fa fa-fw fa-upload" />
                          WCS
                        </Button>
                      </Tooltip>
                      <Tooltip
                        placement="bottom"
                        content={i18n._('Import predefined tool probe commands to update the Tool Length Offset (TLO)')}
                      >
                        <Button
                          btnSize="xs"
                          btnStyle="flat"
                          style={{
                            minWidth: 'auto',
                          }}
                          onClick={() => {
                            const value = TOOL_PROBE_OVERRIDE_TLO_EXAMPLE;
                            this.setState({ toolProbeCustomCommands: value });
                          }}
                        >
                          <i className="fa fa-fw fa-upload" />
                          TLO
                        </Button>
                      </Tooltip>
                      <Dropdown.Toggle btnSize="xs" />
                      <Dropdown.Menu
                        style={{
                          height: 180,
                          overflowY: 'auto',
                        }}
                      >
                        {variables.map(v => {
                          if (typeof v === 'object') {
                            return (
                              <MenuItem
                                header={v.type === 'header'}
                                key={uniqueId()}
                              >
                                {v.text}
                              </MenuItem>
                            );
                          }

                          return (
                            <MenuItem
                              eventKey={v}
                              key={uniqueId()}
                            >
                              {v}
                            </MenuItem>
                          );
                        })}
                      </Dropdown.Menu>
                    </Dropdown>
                  </div>
                )}
                {!this.state.isToolProbeCustomCommandsEditable && ensureString(toolProbeCustomCommands).length > 0 && (
                  <TextPreview
                    style={{
                      maxHeight: 150,
                    }}
                  >
                    {toolProbeCustomCommands}
                  </TextPreview>
                )}
                {!this.state.isToolProbeCustomCommandsEditable && ensureString(toolProbeCustomCommands).length === 0 && (
                  <div className="text-error">
                    {i18n._('Warning: No custom tool probe commands are defined')}
                  </div>
                )}
                {this.state.isToolProbeCustomCommandsEditable && (
                  <div>
                    <div style={{ marginBottom: 8 }}>
                      <TextEditable
                        ref={c => {
                          this.fields.toolProbeCustomCommands = c;
                        }}
                        style={{
                          whiteSpace: 'pre',
                          overflowWrap: 'normal',
                          minHeight: 150,
                          maxHeight: 200,
                          resize: 'vertical',
                          overflow: 'auto',
                        }}
                        value={this.state.toolProbeCustomCommands}
                        onChange={(event) => {
                          const value = event.target.value;
                          this.setState({ toolProbeCustomCommands: value });
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', columnGap: 8 }}>
                      <Button
                        btnSize="sm"
                        btnStyle="flat"
                        onClick={() => {
                          const value = this.state.toolProbeCustomCommands;
                          actions.setToolProbeCustomCommands(value);

                          this.setState({ isToolProbeCustomCommandsEditable: false });
                        }}
                      >
                        {i18n._('OK')}
                      </Button>
                      <Button
                        btnSize="sm"
                        btnStyle="flat"
                        onClick={() => {
                          this.setState({
                            toolProbeCustomCommands: toolProbeCustomCommands, // revert back
                            isToolProbeCustomCommandsEditable: false,
                          });
                        }}
                      >
                        {i18n._('Cancel')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {isToolProbeDefaultView && (
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
                          min={0}
                          step={step}
                          onChange={(event) => {
                            const value = ensureNumber(event.target.value);
                            if (value > 0) {
                              actions.setToolProbeDistance(value);
                            } else {
                              const defaultToolProbeDistance = 1;
                              const adjustedValue = mapValueToUnits(defaultToolProbeDistance, units);
                              actions.setToolProbeDistance(adjustedValue);
                            }
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
                          min={0}
                          step={step}
                          onChange={(event) => {
                            const value = event.target.value;
                            if (value > 0) {
                              actions.setToolProbeFeedrate(value);
                            } else {
                              const defaultToolProbeFeedrate = 10;
                              const adjustedValue = mapValueToUnits(defaultToolProbeFeedrate, units);
                              actions.setToolProbeFeedrate(adjustedValue);
                            }
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
                <div>
                  <div
                    style={{
                      display: 'flex',
                      columnGap: 8,
                      alignItems: 'center',
                    }}
                  >
                    <label className="control-label">
                      {i18n._('Tool Probe Commands')}
                    </label>
                    {isReady && (
                      <div style={{ marginBottom: 5 }}>
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
                    )}
                  </div>
                  {isReady && (
                  <TextPreview
                    style={{
                      maxHeight: 150,
                    }}
                  >
                    {toolProbeCommands}
                  </TextPreview>
                  )}
                  {!isReady && (
                    <div>
                      <i>{i18n._('Connect to the controller to view the tool probe commands.')}</i>
                    </div>
                  )}
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
