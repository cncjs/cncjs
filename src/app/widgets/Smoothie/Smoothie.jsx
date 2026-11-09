import {
  Accordion,
  AccordionBody,
  AccordionHeader,
  AccordionItem,
  Box,
} from '@tonic-ui/react';
import { ensureArray } from 'ensure-type';
import _get from 'lodash/get';
import _mapValues from 'lodash/mapValues';
import React from 'react';
import mapGCodeToText from '@app/lib/gcode-text';
import i18n from '@app/lib/i18n';
import Overrides from './Overrides';

/**
 * @param {{
 *   controllerState?: object,
 *   panel: {
 *     modalGroups: { expanded: boolean },
 *     statusReports: { expanded: boolean },
 *   },
 *   setPanelExpanded: (panelName: string, isExpanded: boolean) => void,
 * }} props
 */
function Smoothie({ controllerState = {}, panel, setPanelExpanded }) {
  const none = '–';
  const parserState = _get(controllerState, 'parserstate', {});
  const machineState = _get(controllerState, 'status.machineState', none);
  const ovF = _get(controllerState, 'status.ovF', 0);
  const ovS = _get(controllerState, 'status.ovS', 0);
  const modal = _mapValues(parserState.modal || {}, mapGCodeToText);

  return (
    <Box>
      <Box mb="3x"><Overrides ovF={ovF} ovS={ovS} /></Box>
      <Box sx={{ '> :not(:first-child)': { borderTop: 0 } }}>
        <ReportSection
          isExpanded={panel.statusReports.expanded}
          title={i18n._('Status Reports')}
          onToggle={({ isExpanded }) => setPanelExpanded('statusReports', isExpanded)}
        >
          <ReportRow label={i18n._('State')}>{machineState}</ReportRow>
          <ReportRow label={i18n._('Feed Rate')}>{_get(parserState, 'feedrate', none)}</ReportRow>
          <ReportRow label={i18n._('Spindle')}>{_get(parserState, 'spindle', none)}</ReportRow>
          <ReportRow label={i18n._('Tool Number')}>{_get(parserState, 'tool', none)}</ReportRow>
        </ReportSection>
        <ReportSection
          isExpanded={panel.modalGroups.expanded}
          title={i18n._('Modal Groups')}
          onToggle={({ isExpanded }) => setPanelExpanded('modalGroups', isExpanded)}
        >
          <ReportRow label={i18n._('Motion')}>{modal.motion || none}</ReportRow>
          <ReportRow label={i18n._('Coordinate')}>{modal.wcs || none}</ReportRow>
          <ReportRow label={i18n._('Plane')}>{modal.plane || none}</ReportRow>
          <ReportRow label={i18n._('Distance')}>{modal.distance || none}</ReportRow>
          <ReportRow label={i18n._('Feed Rate')}>{modal.feedrate || none}</ReportRow>
          <ReportRow label={i18n._('Units')}>{modal.units || none}</ReportRow>
          <ReportRow label={i18n._('Program')}>{modal.program || none}</ReportRow>
          <ReportRow label={i18n._('Spindle')}>{modal.spindle || none}</ReportRow>
          <ReportRow label={i18n._('Coolant')}>
            {ensureArray(modal.coolant).map(coolant => (
              <Box key={coolant} title={coolant}>{coolant || none}</Box>
            ))}
          </ReportRow>
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

/**
 * @param {{ children?: React.ReactNode, label: string }} props
 */
function ReportRow({ children, label }) {
  return (
    <Box alignItems="center" display="flex" mb="2x">
      <Box
        overflow="hidden" textOverflow="ellipsis" title={label}
        whiteSpace="nowrap" width="50%"
      >
        {label}
      </Box>
      <Box
        bg="background.high"
        border={1}
        borderColor="border.secondary"
        borderRadius="sm"
        minHeight="22px"
        overflow="hidden"
        px="1x"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
        width="50%"
      >
        {children}
      </Box>
    </Box>
  );
}

export default Smoothie;
