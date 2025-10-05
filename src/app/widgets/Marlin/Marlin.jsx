import { ensureArray } from 'ensure-type';
import get from 'lodash/get';
import isNumber from 'lodash/isNumber';
import mapValues from 'lodash/mapValues';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { ProgressBar } from 'react-bootstrap';
import controller from 'app/lib/controller';
import mapGCodeToText from 'app/lib/gcode-text';
import i18n from 'app/lib/i18n';
import { Button } from 'app/components/Buttons';
import Panel from 'app/components/Panel';
import Space from 'app/components/Space';
import Toggler from 'app/components/Toggler';
import FadeInOut from './FadeInOut';
import Overrides from './Overrides';
import styles from './index.styl';
import IconExtruder from './icons/extruder';
import IconHeatedBed from './icons/heated-bed';

class Marlin extends PureComponent {
    static propTypes = {
      state: PropTypes.object,
      actions: PropTypes.object
    };

    extruderPowerMax = 127;

    heatedBedPowerMax = 127;

    // M104 Set the target temperature for a hotend.
    setExtruderTemperature = (deg) => () => {
      controller.command('gcode', `M104 S${deg}`);
      controller.command('gcode', 'M105');
    };

    // M140 Set the target temperature for the heated bed.
    setHeatedBedTemperature = (deg) => () => {
      controller.command('gcode', `M140 S${deg}`);
      controller.command('gcode', 'M105');
    };

    render() {
      const { state, actions } = this.props;
      const none = '–';
      const panel = state.panel;
      const controllerState = state.controller.state || {};
      const ovF = get(controllerState, 'ovF', 0);
      const ovS = get(controllerState, 'ovS', 0);
      const feedrate = get(controllerState, 'feedrate') || none;
      const spindle = get(controllerState, 'spindle') || none;
      const extruder = get(controllerState, 'extruder') || {};
      const heatedBed = get(controllerState, 'heatedBed') || {};
      const showExtruderTemperature = (extruder.deg !== undefined && extruder.degTarget !== undefined);
      const showExtruderPower = (extruder.power !== undefined);
      const showHeatedBedTemperature = (heatedBed.deg !== undefined && heatedBed.degTarget !== undefined);
      const showHeatedBedPower = (heatedBed.power !== undefined);
      const showHeaterStatus = [
        showExtruderTemperature,
        showExtruderPower,
        showHeatedBedTemperature,
        showHeatedBedPower
      ].some(x => !!x);
      const canSetExtruderTemperature = isNumber(state.heater.extruder);
      const canSetHeatedBedTemperature = isNumber(state.heater.heatedBed);
      const modal = mapValues(controllerState.modal || {}, mapGCodeToText);
      const extruderIsHeating = (Number(extruder.degTarget) > Number(extruder.deg));
      const heatedBedIsHeating = (Number(heatedBed.degTarget) > Number(heatedBed.deg));
      const extruderPower = Number(extruder.power) || 0;
      const heatedBedPower = Number(heatedBed.power) || 0;

      this.extruderPowerMax = Math.max(this.extruderPowerMax, extruderPower);
      this.heatedBedPowerMax = Math.max(this.heatedBedPowerMax, heatedBedPower);

      return (
        <div>
          <Overrides ovF={ovF} ovS={ovS} />
          <Panel className={styles.panel}>
            <Panel.Heading className={styles.panelHeading}>
              <Toggler
                className="clearfix"
                onToggle={actions.toggleHeaterControl}
                title={panel.heaterControl.expanded ? i18n._('Hide') : i18n._('Show')}
              >
                <div className="pull-left">{i18n._('Heater Control')}</div>
                <Toggler.Icon
                  className="pull-right"
                  expanded={panel.heaterControl.expanded}
                />
              </Toggler>
            </Panel.Heading>
            {panel.heaterControl.expanded && (
              <Panel.Body>
                <div
                  className="table-form"
                  style={{
                    marginBottom: showHeaterStatus ? 15 : 0
                  }}
                >
                  <div className="table-form-row">
                    <div className="table-form-col table-form-col-label">
                      <FadeInOut disabled={!extruderIsHeating} from={0.3} to={1}>
                        <IconExtruder
                          color={extruderIsHeating ? '#000' : '#666'}
                          size={24}
                        />
                      </FadeInOut>
                      <Space width="4" />
                      {i18n._('Extruder')}
                    </div>
                    <div className="table-form-col">
                      <div className="input-group input-group-sm">
                        <input
                          type="number"
                          value={state.heater.extruder}
                          step="1"
                          min="0"
                          className="form-control"
                          onChange={actions.changeExtruderTemperature}
                        />
                        <span className="input-group-addon">{i18n._('°C')}</span>
                      </div>
                    </div>
                    <div className="table-form-col">
                      <Space width="8" />
                    </div>
                    <div className="table-form-col">
                      <Button
                        compact
                        btnSize="xs"
                        btnStyle="danger"
                        disabled={!canSetExtruderTemperature}
                        onClick={this.setExtruderTemperature(state.heater.extruder)}
                        title={i18n._('Set the target temperature for the extruder')}
                      >
                        <i
                          className="fa fa-fw fa-check"
                          style={{ fontSize: 16 }}
                        />
                      </Button>
                    </div>
                    <div className="table-form-col">
                      <Space width="8" />
                    </div>
                    <div className="table-form-col">
                      <Button
                        compact
                        btnSize="xs"
                        btnStyle="flat"
                        title={i18n._('Cancel')}
                        onClick={this.setExtruderTemperature(0)}
                      >
                        <i
                          className="fa fa-fw fa-close"
                          style={{ fontSize: 16 }}
                        />
                      </Button>
                    </div>
                  </div>
                  <div className="table-form-row">
                    <div className="table-form-col table-form-col-label">
                      <FadeInOut disabled={!heatedBedIsHeating} from={0.3} to={1}>
                        <IconHeatedBed
                          color={heatedBedIsHeating ? '#000' : '#666'}
                          size={24}
                        />
                      </FadeInOut>
                      <Space width="4" />
                      {i18n._('Heated Bed')}
                    </div>
                    <div className="table-form-col">
                      <div className="input-group input-group-sm">
                        <input
                          type="number"
                          value={state.heater.heatedBed}
                          step="1"
                          min="0"
                          className="form-control"
                          onChange={actions.changeHeatedBedTemperature}
                        />
                        <span className="input-group-addon">{i18n._('°C')}</span>
                      </div>
                    </div>
                    <div className="table-form-col">
                      <Space width="8" />
                    </div>
                    <div className="table-form-col">
                      <Button
                        compact
                        btnSize="xs"
                        btnStyle="danger"
                        disabled={!canSetHeatedBedTemperature}
                        onClick={this.setHeatedBedTemperature(state.heater.heatedBed)}
                        title={i18n._('Set the target temperature for the heated bed')}
                      >
                        <i
                          className="fa fa-fw fa-check"
                          style={{ fontSize: 16 }}
                        />
                      </Button>
                    </div>
                    <div className="table-form-col">
                      <Space width="8" />
                    </div>
                    <div className="table-form-col">
                      <Button
                        compact
                        btnSize="xs"
                        btnStyle="flat"
                        onClick={this.setHeatedBedTemperature(0)}
                        title={i18n._('Cancel')}
                      >
                        <i
                          className="fa fa-fw fa-close"
                          style={{ fontSize: 16 }}
                        />
                      </Button>
                    </div>
                  </div>
                </div>
                {showExtruderTemperature && (
                  <div className="row no-gutters">
                    <div className="col col-xs-7">
                      <div className={styles.textEllipsis} title={i18n._('Extruder Temperature')}>
                        {i18n._('Extruder Temperature')}
                      </div>
                    </div>
                    <div className="col col-xs-5">
                      <div className={styles.well}>
                        {`${extruder.deg}°C / ${extruder.degTarget}°C`}
                      </div>
                    </div>
                  </div>
                )}
                {showHeatedBedTemperature && (
                  <div className="row no-gutters">
                    <div className="col col-xs-7">
                      <div className={styles.textEllipsis} title={i18n._('Heated Bed Temperature')}>
                        {i18n._('Heated Bed Temperature')}
                      </div>
                    </div>
                    <div className="col col-xs-5">
                      <div className={styles.well}>
                        {`${heatedBed.deg}°C / ${heatedBed.degTarget}°C`}
                      </div>
                    </div>
                  </div>
                )}
                {showExtruderPower && (
                  <div className="row no-gutters">
                    <div className="col col-xs-7">
                      <div className={styles.textEllipsis} title={i18n._('Extruder Power')}>
                        {i18n._('Extruder Power')}
                      </div>
                    </div>
                    <div className="col col-xs-5">
                      <ProgressBar
                        style={{ marginBottom: 0 }}
                        bsStyle="info"
                        min={0}
                        max={this.extruderPowerMax}
                        now={extruderPower}
                        label={(
                          <span className={styles.progressbarLabel}>
                            {extruderPower}
                          </span>
                        )}
                      />
                    </div>
                  </div>
                )}
                {showHeatedBedPower && (
                  <div className="row no-gutters">
                    <div className="col col-xs-7">
                      <div className={styles.textEllipsis} title={i18n._('Heated Bed Power')}>
                        {i18n._('Heated Bed Power')}
                      </div>
                    </div>
                    <div className="col col-xs-5">
                      <ProgressBar
                        style={{ marginBottom: 0 }}
                        bsStyle="info"
                        min={0}
                        max={this.heatedBedPowerMax}
                        now={heatedBedPower}
                        label={(
                          <span className={styles.progressbarLabel}>
                            {heatedBedPower}
                          </span>
                        )}
                      />
                    </div>
                  </div>
                )}
              </Panel.Body>
            )}
          </Panel>
          <Panel className={styles.panel}>
            <Panel.Heading className={styles.panelHeading}>
              <Toggler
                className="clearfix"
                onToggle={() => {
                  actions.toggleStatusReports();
                }}
                title={panel.statusReports.expanded ? i18n._('Hide') : i18n._('Show')}
              >
                <div className="pull-left">{i18n._('Status Reports')}</div>
                <Toggler.Icon
                  className="pull-right"
                  expanded={panel.statusReports.expanded}
                />
              </Toggler>
            </Panel.Heading>
            {panel.statusReports.expanded && (
              <Panel.Body>
                <div className="row no-gutters">
                  <div className="col col-xs-4">
                    <div className={styles.textEllipsis} title={i18n._('Feed Rate')}>
                      {i18n._('Feed Rate')}
                    </div>
                  </div>
                  <div className="col col-xs-8">
                    <div className={styles.well}>
                      {feedrate}
                    </div>
                  </div>
                </div>
                <div className="row no-gutters">
                  <div className="col col-xs-4">
                    <div className={styles.textEllipsis} title={i18n._('Spindle')}>
                      {i18n._('Spindle')}
                    </div>
                  </div>
                  <div className="col col-xs-8">
                    <div className={styles.well}>
                      {spindle}
                    </div>
                  </div>
                </div>
              </Panel.Body>
            )}
          </Panel>
          <Panel className={styles.panel}>
            <Panel.Heading className={styles.panelHeading}>
              <Toggler
                className="clearfix"
                onToggle={() => {
                  actions.toggleModalGroups();
                }}
                title={panel.modalGroups.expanded ? i18n._('Hide') : i18n._('Show')}
              >
                <div className="pull-left">{i18n._('Modal Groups')}</div>
                <Toggler.Icon
                  className="pull-right"
                  expanded={panel.modalGroups.expanded}
                />
              </Toggler>
            </Panel.Heading>
            {panel.modalGroups.expanded && (
              <Panel.Body>
                <div className="row no-gutters">
                  <div className="col col-xs-4">
                    <div className={styles.textEllipsis} title={i18n._('Motion')}>
                      {i18n._('Motion')}
                    </div>
                  </div>
                  <div className="col col-xs-8">
                    <div className={styles.well} title={modal.motion}>
                      {modal.motion || none}
                    </div>
                  </div>
                </div>
                <div className="row no-gutters">
                  <div className="col col-xs-4">
                    <div className={styles.textEllipsis} title={i18n._('Coordinate')}>
                      {i18n._('Coordinate')}
                    </div>
                  </div>
                  <div className="col col-xs-8">
                    <div className={styles.well} title={modal.wcs}>
                      {modal.wcs || none}
                    </div>
                  </div>
                </div>
                <div className="row no-gutters">
                  <div className="col col-xs-4">
                    <div className={styles.textEllipsis} title={i18n._('Plane')}>
                      {i18n._('Plane')}
                    </div>
                  </div>
                  <div className="col col-xs-8">
                    <div className={styles.well} title={modal.plane}>
                      {modal.plane || none}
                    </div>
                  </div>
                </div>
                <div className="row no-gutters">
                  <div className="col col-xs-4">
                    <div className={styles.textEllipsis} title={i18n._('Distance')}>
                      {i18n._('Distance')}
                    </div>
                  </div>
                  <div className="col col-xs-8">
                    <div className={styles.well} title={modal.distance}>
                      {modal.distance || none}
                    </div>
                  </div>
                </div>
                <div className="row no-gutters">
                  <div className="col col-xs-4">
                    <div className={styles.textEllipsis} title={i18n._('Feed Rate')}>
                      {i18n._('Feed Rate')}
                    </div>
                  </div>
                  <div className="col col-xs-8">
                    <div className={styles.well} title={modal.feedrate}>
                      {modal.feedrate || none}
                    </div>
                  </div>
                </div>
                <div className="row no-gutters">
                  <div className="col col-xs-4">
                    <div className={styles.textEllipsis} title={i18n._('Units')}>
                      {i18n._('Units')}
                    </div>
                  </div>
                  <div className="col col-xs-8">
                    <div className={styles.well} title={modal.units}>
                      {modal.units || none}
                    </div>
                  </div>
                </div>
                <div className="row no-gutters">
                  <div className="col col-xs-4">
                    <div className={styles.textEllipsis} title={i18n._('Program')}>
                      {i18n._('Program')}
                    </div>
                  </div>
                  <div className="col col-xs-8">
                    <div className={styles.well} title={modal.program}>
                      {modal.program || none}
                    </div>
                  </div>
                </div>
                <div className="row no-gutters">
                  <div className="col col-xs-4">
                    <div className={styles.textEllipsis} title={i18n._('Spindle')}>
                      {i18n._('Spindle')}
                    </div>
                  </div>
                  <div className="col col-xs-8">
                    <div className={styles.well} title={modal.spindle}>
                      {modal.spindle || none}
                    </div>
                  </div>
                </div>
                <div className="row no-gutters">
                  <div className="col col-xs-4">
                    <div className={styles.textEllipsis} title={i18n._('Coolant')}>
                      {i18n._('Coolant')}
                    </div>
                  </div>
                  <div className="col col-xs-8">
                    <div className={styles.well}>
                      {ensureArray(modal.coolant).map(coolant => (
                        <div title={coolant} key={coolant}>{coolant || none}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </Panel.Body>
            )}
          </Panel>
        </div>
      );
    }
}

export default Marlin;
