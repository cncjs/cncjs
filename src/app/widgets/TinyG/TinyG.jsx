import {
  Accordion,
  AccordionBody,
  AccordionHeader,
  AccordionItem,
  Box,
  Button,
  LinearProgress,
  Text,
} from '@tonic-ui/react';
import { BoltIcon, CloseIcon } from '@tonic-ui/react-icons';
import { ensureArray, ensurePositiveNumber } from 'ensure-type';
import get from 'lodash/get';
import mapValues from 'lodash/mapValues';
import React, { useRef } from 'react';
import {
  TINYG_MACHINE_STATE_ALARM,
  TINYG_MACHINE_STATE_CYCLE,
  TINYG_MACHINE_STATE_END,
  TINYG_MACHINE_STATE_HOLD,
  TINYG_MACHINE_STATE_HOMING,
  TINYG_MACHINE_STATE_INITIALIZING,
  TINYG_MACHINE_STATE_INTERLOCK,
  TINYG_MACHINE_STATE_JOG,
  TINYG_MACHINE_STATE_PANIC,
  TINYG_MACHINE_STATE_PROBE,
  TINYG_MACHINE_STATE_READY,
  TINYG_MACHINE_STATE_RUN,
  TINYG_MACHINE_STATE_SHUTDOWN,
  TINYG_MACHINE_STATE_STOP,
} from '@app/constants/controller';
import controller from '@app/lib/controller';
import mapGCodeToText from '@app/lib/gcode-text';
import i18n from '@app/lib/i18n';
import useWidgetConfig from '@app/widgets/shared/useWidgetConfig';
import Overrides from './Overrides';

const machineStateText = {
  [TINYG_MACHINE_STATE_INITIALIZING]: 'controller:TinyG.machineState.initializing',
  [TINYG_MACHINE_STATE_READY]: 'controller:TinyG.machineState.ready',
  [TINYG_MACHINE_STATE_ALARM]: 'controller:TinyG.machineState.alarm',
  [TINYG_MACHINE_STATE_STOP]: 'controller:TinyG.machineState.stop',
  [TINYG_MACHINE_STATE_END]: 'controller:TinyG.machineState.end',
  [TINYG_MACHINE_STATE_RUN]: 'controller:TinyG.machineState.run',
  [TINYG_MACHINE_STATE_HOLD]: 'controller:TinyG.machineState.hold',
  [TINYG_MACHINE_STATE_PROBE]: 'controller:TinyG.machineState.probe',
  [TINYG_MACHINE_STATE_CYCLE]: 'controller:TinyG.machineState.cycle',
  [TINYG_MACHINE_STATE_HOMING]: 'controller:TinyG.machineState.homing',
  [TINYG_MACHINE_STATE_JOG]: 'controller:TinyG.machineState.jog',
  [TINYG_MACHINE_STATE_INTERLOCK]: 'controller:TinyG.machineState.interlock',
  [TINYG_MACHINE_STATE_SHUTDOWN]: 'controller:TinyG.machineState.shutdown',
  [TINYG_MACHINE_STATE_PANIC]: 'controller:TinyG.machineState.panic',
};

/**
 * @param {{
 *   controllerData: { settings?: object, state?: object },
 * }} props
 */
function TinyG({ controllerData }) {
  const config = useWidgetConfig();
  const controllerState = controllerData.state || {};
  const controllerSettings = controllerData.settings || {};
  const { fv, mfo, mto, sso } = controllerSettings;
  const ovF = fv >= 0.99 ? Math.round(mfo * 100) || 0 : 0;
  const ovS = fv >= 0.98 ? Math.round(sso * 100) || 0 : 0;
  const ovT = fv >= 0.99 ? Math.round(mto * 100) || 0 : 0;
  const plannerBuffer = ensurePositiveNumber(get(controllerState, 'qr'));
  const plannerBufferMaxRef = useRef(28);
  plannerBufferMaxRef.current = Math.max(plannerBufferMaxRef.current, plannerBuffer);
  const pwr = get(controllerState, 'pwr');
  const stateTextKey = machineStateText[get(controllerState, 'machineState')];
  const modal = mapValues(get(controllerState, 'modal', {}), mapGCodeToText);

  const panels = {
    modalGroups: Boolean(config.get('panel.modalGroups.expanded')),
    powerManagement: Boolean(config.get('panel.powerManagement.expanded')),
    queueReports: Boolean(config.get('panel.queueReports.expanded')),
    statusReports: Boolean(config.get('panel.statusReports.expanded')),
  };
  const togglePanel = (name, isExpanded) => config.set(`panel.${name}.expanded`, isExpanded);

  return (
    <Box p="3x">
      <Overrides ovF={ovF} ovS={ovS} ovT={ovT} />
      <Box sx={{ '> :not(:first-child)': { borderTop: 0 } }}>
        <ReportSection
          isExpanded={panels.powerManagement}
          title={i18n._('Power Management')}
          onToggle={({ isExpanded }) => togglePanel('powerManagement', isExpanded)}
        >
          {pwr && (
            <Box p="3x">
              <Box display="flex" gap="2x" mb="2x">
                <Button
                  flex="1" onClick={() => {
                    controller.command('gcode', '{me:0}');
                    controller.command('gcode', '{pwr:n}');
                  }}
                >
                  <BoltIcon aria-hidden="true" size="1em" />
                  {i18n._('Enable Motors')}
                </Button>
                <Button
                  flex="1" onClick={() => {
                    controller.command('gcode', '{md:0}');
                    controller.command('gcode', '{pwr:n}');
                  }}
                >
                  <CloseIcon aria-hidden="true" size="1em" />
                  {i18n._('Disable Motors')}
                </Button>
              </Box>
              {Object.entries(pwr).map(([key, value]) => (
                <ProgressRow
                  key={key}
                  label={i18n._('Motor {{n}}', { n: key })}
                  max={1}
                  value={value}
                />
              ))}
            </Box>
          )}
        </ReportSection>
        <ReportSection
          isExpanded={panels.queueReports}
          title={i18n._('Queue Reports')}
          onToggle={({ isExpanded }) => togglePanel('queueReports', isExpanded)}
        >
          <Box p="3x">
            <ProgressRow
              label={i18n._('Planner Buffer')}
              max={plannerBufferMaxRef.current}
              value={plannerBuffer}
            />
          </Box>
        </ReportSection>
        <ReportSection
          isExpanded={panels.statusReports}
          title={i18n._('Status Reports')}
          onToggle={({ isExpanded }) => togglePanel('statusReports', isExpanded)}
        >
          <Box p="3x">
            <ReportRow label={i18n._('State')}>
              {stateTextKey ? i18n.t(stateTextKey) : '–'}
            </ReportRow>
            <ReportRow label={i18n._('Feed Rate')}>{Number(get(controllerState, 'feedrate')) || 0}</ReportRow>
            <ReportRow label={i18n._('Velocity')}>{Number(get(controllerState, 'velocity')) || 0}</ReportRow>
            <ReportRow label={i18n._('Line')}>{Number(get(controllerState, 'line')) || 0}</ReportRow>
          </Box>
        </ReportSection>
        <ReportSection
          isExpanded={panels.modalGroups}
          title={i18n._('Modal Groups')}
          onToggle={({ isExpanded }) => togglePanel('modalGroups', isExpanded)}
        >
          <Box p="3x">
            <ReportRow label={i18n._('Motion')}>{modal.motion || '–'}</ReportRow>
            <ReportRow label={i18n._('Coordinate')}>{modal.wcs || '–'}</ReportRow>
            <ReportRow label={i18n._('Plane')}>{modal.plane || '–'}</ReportRow>
            <ReportRow label={i18n._('Distance')}>{modal.distance || '–'}</ReportRow>
            <ReportRow label={i18n._('Feed Rate')}>{modal.feedrate || '–'}</ReportRow>
            <ReportRow label={i18n._('Units')}>{modal.units || '–'}</ReportRow>
            <ReportRow label={i18n._('Path')}>{modal.path || '–'}</ReportRow>
            <ReportRow label={i18n._('Spindle')}>{modal.spindle || '–'}</ReportRow>
            <ReportRow label={i18n._('Coolant')}>
              {ensureArray(modal.coolant).map(value => <Box key={value}>{value || '–'}</Box>)}
            </ReportRow>
          </Box>
        </ReportSection>
      </Box>
    </Box>
  );
}

/**
 * @param {{
 *   children?: React.ReactNode,
 *   isExpanded: boolean,
 *   onToggle: ({ isExpanded: boolean }) => void,
 *   title: string,
 * }} props
 */
function ReportSection({ children, isExpanded, onToggle, title }) {
  return (
    <Accordion border={1} borderColor="border.secondary">
      <AccordionItem isExpanded={isExpanded} onToggle={onToggle}>
        <AccordionHeader>{title}</AccordionHeader>
        <AccordionBody>{children}</AccordionBody>
      </AccordionItem>
    </Accordion>
  );
}

/** @param {{ children?: React.ReactNode, label: string }} props */
function ReportRow({ children, label }) {
  return (
    <Box alignItems="center" display="flex" mb="2x">
      <Text sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label} width="50%">
        {label}
      </Text>
      <Box
        sx={{
          backgroundColor: 'actions.hovered',
          borderRadius: '.25rem',
          fontSize: '.75rem',
          padding: '.125rem .5rem',
        }}
        width="50%"
      >
        {children}
      </Box>
    </Box>
  );
}

/** @param {{ label: string, max: number, value: number }} props */
function ProgressRow({ label, max, value }) {
  return (
    <Box alignItems="center" display="flex" mb="2x">
      <Text title={label} width="50%">{label}</Text>
      <Box width="50%">
        <LinearProgress
          aria-label={label} max={max} min={0}
          value={value} variant="determinate"
        />
        <Text>{value}</Text>
      </Box>
    </Box>
  );
}

export default TinyG;
