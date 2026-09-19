import React from 'react';
import Columns from 'app/components/Columns';
import DataTable from 'app/components/DataTable';
import ProgressBar from 'app/components/ProgressBar';
import Readout from 'app/components/Readout';
import Stack from 'app/components/Stack';
import Surface from 'app/components/Surface';
import i18n from 'app/lib/i18n';
import { toDisplayUnits } from 'app/lib/units';
import {
  dimensionRows,
  formatCount,
  formatDuration,
  formatTimestamp,
  jobProgress,
} from '../selectors';

/**
 * The loaded job, as a panel of readings.
 *
 * It arranges shared components and holds no styling of its own: the look
 * lives in the component library, the figures come from the selectors, and the
 * data comes from whatever passes `state` in. It does not know whether it is a
 * widget in the workspace, a tile in a grid or a screen — nothing here reads a
 * width, a container or a placement.
 *
 * The six readings are paired into two columns rather than stacked, because a
 * panel beside a machine is read at a glance and a single column of them
 * scrolls the last ones out of sight. Progress is the one figure the panel is
 * about, so it is the one that gets the large face — and it appears only when
 * there is a job, because a large 0% with nothing loaded is a lie told
 * prominently.
 */
const JobProgress = ({ state }) => {
  const { units, total, sent, received, startTime, finishTime, elapsedTime, remainingTime, bbox } = state;
  const displayUnits = toDisplayUnits(units);
  const percent = jobProgress({ received, total });
  const hasJob = total > 0;

  return (
    <Surface>
      <Stack>
        {hasJob && (
          <Readout label={i18n._('Progress')} value={`${percent}%`} emphasis />
        )}
        {hasJob && (
          <ProgressBar percent={percent} label={i18n._('Job progress')} />
        )}
        <DataTable
          data-table="dimension"
          headings={[i18n._('Axis'), i18n._('Min'), i18n._('Max'), i18n._('Dimension')]}
          align={['left', 'right', 'right', 'right']}
          rows={dimensionRows(bbox, units).map(([axis, min, max, span]) => [
            axis,
            `${min} ${displayUnits}`,
            `${max} ${displayUnits}`,
            `${span} ${displayUnits}`,
          ])}
        />
        <Columns>
          <Readout label={i18n._('Sent')} value={formatCount(sent, total)} />
          <Readout label={i18n._('Received')} value={formatCount(received, total)} />
          <Readout label={i18n._('Start Time')} value={formatTimestamp(startTime)} />
          <Readout label={i18n._('Elapsed Time')} value={formatDuration(elapsedTime)} />
          <Readout label={i18n._('Finish Time')} value={formatTimestamp(finishTime)} />
          <Readout label={i18n._('Remaining Time')} value={formatDuration(remainingTime)} />
        </Columns>
      </Stack>
    </Surface>
  );
};

export default JobProgress;
