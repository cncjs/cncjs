import { ensureArray } from 'ensure-type';
import { Box } from '@tonic-ui/react';
import _get from 'lodash/get';
import _mapValues from 'lodash/mapValues';
import React from 'react';
import { connect } from 'react-redux';
import mapGCodeToText from '@app/lib/gcode-text';
import i18n from '@app/lib/i18n';
import { nonblankValue } from '@app/lib/utils';
import useWidgetConfig from '@app/widgets/shared/useWidgetConfig';
import ReportRow from './components/ReportRow';
import ReportSection from './components/ReportSection';

/**
 * @param {{ modal?: Record<string, unknown> }} props
 */
function ModalGroups({
  modal,
}) {
  const config = useWidgetConfig();
  const expanded = config.get('panel.modalGroups.expanded');
  return (
    <ReportSection
      isExpanded={Boolean(expanded)}
      title={i18n._('Modal Groups')}
      onToggle={({ isExpanded }) => config.set('panel.modalGroups.expanded', isExpanded)}
    >
      <Box p="3x">
        <ReportRow label={i18n._('Motion')}>{nonblankValue(modal.motion)}</ReportRow>
        <ReportRow label={i18n._('Coordinate')}>{nonblankValue(modal.wcs)}</ReportRow>
        <ReportRow label={i18n._('Plane')}>{nonblankValue(modal.plane)}</ReportRow>
        <ReportRow label={i18n._('Distance')}>{nonblankValue(modal.distance)}</ReportRow>
        <ReportRow label={i18n._('Feed Rate')}>{nonblankValue(modal.feedrate)}</ReportRow>
        <ReportRow label={i18n._('Units')}>{nonblankValue(modal.units)}</ReportRow>
        <ReportRow label={i18n._('Program')}>{nonblankValue(modal.program)}</ReportRow>
        <ReportRow label={i18n._('Spindle')}>{nonblankValue(modal.spindle)}</ReportRow>
        <ReportRow label={i18n._('Coolant')}>
          {ensureArray(modal.coolant).map(coolant => (
            <div title={coolant} key={coolant}>{nonblankValue(coolant)}</div>
          ))}
        </ReportRow>
      </Box>
    </ReportSection>
  );
}

export default connect(store => {
  const controllerState = _get(store, 'controller.state');
  const parserstate = _get(controllerState, 'parserstate');
  const modal = _get(parserstate, 'modal');

  return {
    modal: _mapValues(modal, mapGCodeToText),
  };
})(ModalGroups);
