import { Box } from '@tonic-ui/react';
import _get from 'lodash/get';
import React from 'react';
import { connect } from 'react-redux';
import i18n from '@app/lib/i18n';
import { nonblankValue } from '@app/lib/utils';
import useWidgetConfig from '@app/widgets/shared/useWidgetConfig';
import ReportRow from './components/ReportRow';
import ReportSection from './components/ReportSection';

/**
 * @param {{ feedrate?: number, machineState?: string, spindle?: number, tool?: number }} props
 */
function StatusReports({
  machineState,
  feedrate,
  spindle,
  tool,
}) {
  const config = useWidgetConfig();
  const expanded = config.get('panel.statusReports.expanded');
  return (
    <ReportSection
      isExpanded={Boolean(expanded)}
      title={i18n._('Status Reports')}
      onToggle={({ isExpanded }) => config.set('panel.statusReports.expanded', isExpanded)}
    >
      <Box p="3x">
        <ReportRow label={i18n._('State')}>{nonblankValue(machineState)}</ReportRow>
        <ReportRow label={i18n._('Feed Rate')}>{nonblankValue(feedrate)}</ReportRow>
        <ReportRow label={i18n._('Spindle')}>{nonblankValue(spindle)}</ReportRow>
        <ReportRow label={i18n._('Tool Number')}>{nonblankValue(tool)}</ReportRow>
      </Box>
    </ReportSection>
  );
}

export default connect(store => {
  const controllerState = _get(store, 'controller.state');
  const machineState = _get(controllerState, 'status.machineState');
  const parserstate = _get(controllerState, 'parserstate');
  const feedrate = _get(controllerState, 'status.feedrate', _get(parserstate, 'feedrate'));
  const spindle = _get(controllerState, 'status.spindle', _get(parserstate, 'spindle'));
  const tool = _get(parserstate, 'tool');

  return {
    machineState,
    feedrate,
    spindle,
    tool,
  };
})(StatusReports);
