import React from 'react';
import Details from 'app/components/Details';
import Disclosure from 'app/components/Disclosure';
import ProgressBar from 'app/components/ProgressBar';
import Readout from 'app/components/Readout';
import Stack from 'app/components/Stack';
import StateChip from 'app/components/StateChip';
import Surface from 'app/components/Surface';
import i18n from 'app/lib/i18n';
import OverrideControls from '../OverrideControls';
import {
  bufferPercent,
  hasOverrides,
  machineState,
  modalReadings,
  queueBuffers,
  statusReadings,
  stateTone,
} from '../selectors';

/**
 * What a Grbl controller is doing, arranged.
 *
 * It holds no styling of its own: the look lives in the component library, the
 * figures come from the selectors, and the data comes from whatever passes
 * `state` in. It does not know whether it is a widget in the workspace, a tile
 * in a grid or a screen — nothing here reads a width, a container or a
 * placement.
 *
 * Which sections are open is a property of the *placement*, not of the
 * machine: a panel put away in the workspace has been put away by someone
 * sitting at that workspace. So `panel` and `onTogglePanel` come in from
 * outside, and whoever passes them is also whoever remembers them.
 */
const MachinePanel = ({ state, panel, onTogglePanel }) => {
  const { controllerState, seenBufferMax, canSend, actions } = state;
  const { status = {}, parserstate: parserState = {} } = controllerState || {};
  const readings = statusReadings(status, parserState);
  const modal = modalReadings(parserState.modal);
  const buffers = queueBuffers(status, seenBufferMax);

  return (
    <Surface>
      <Stack>
        <Disclosure
          title={i18n._('Status Reports')}
          expanded={panel.statusReports.expanded}
          onToggle={() => onTogglePanel('statusReports')}
        >
          <Stack>
            {/*
              * The state is the one thing this panel is about, so it is a
              * reading in its own right rather than a row in the list below
              * it — and it is a chip, because the colour answers before the
              * word does.
              */}
            <Readout
              name="state"
              label={i18n._('State')}
              value={(
                <StateChip tone={stateTone(status.activeState)}>
                  {machineState(status)}
                </StateChip>
              )}
            />
            <Details
              items={[
                { name: 'feedrate', label: i18n._('Feed Rate'), value: readings.feedrate },
                { name: 'spindle', label: i18n._('Spindle'), value: readings.spindle },
                { name: 'tool', label: i18n._('Tool Number'), value: readings.tool },
              ]}
            />
          </Stack>
        </Disclosure>

        {/*
          * The controls come after the reading they act on. An override is
          * something an operator reaches for *because* of what the state and
          * the feed rate say, and a panel that puts the adjustment above the
          * figure asks to be used in the wrong order.
          */}
        {hasOverrides(status) && (
          <OverrideControls status={status} actions={actions} disabled={!canSend} />
        )}

        {/*
          * Only rendered when the controller actually reports its buffers,
          * which a default Grbl build does not: `$10` carries the machine
          * position bit and not the buffer one. Two bars pinned at zero would
          * read as a queue that has stalled.
          */}
        {buffers && (
          <Disclosure
            title={i18n._('Queue Reports')}
            expanded={panel.queueReports.expanded}
            onToggle={() => onTogglePanel('queueReports')}
          >
            <Stack>
              <Buffer
                label={i18n._('Planner Buffer')}
                value={buffers.planner}
                max={buffers.plannerMax}
              />
              <Buffer
                label={i18n._('Receive Buffer')}
                value={buffers.rx}
                max={buffers.rxMax}
              />
            </Stack>
          </Disclosure>
        )}

        <Disclosure
          title={i18n._('Modal Groups')}
          expanded={panel.modalGroups.expanded}
          onToggle={() => onTogglePanel('modalGroups')}
        >
          <Details
            items={[
              { name: 'motion', label: i18n._('Motion'), value: modal.motion },
              { name: 'wcs', label: i18n._('Coordinate'), value: modal.wcs },
              { name: 'plane', label: i18n._('Plane'), value: modal.plane },
              { name: 'distance', label: i18n._('Distance'), value: modal.distance },
              { name: 'modal-feedrate', label: i18n._('Feed Rate'), value: modal.feedrate },
              { name: 'units', label: i18n._('Units'), value: modal.units },
              { name: 'program', label: i18n._('Program'), value: modal.program },
              { name: 'modal-spindle', label: i18n._('Spindle'), value: modal.spindle },
              { name: 'coolant', label: i18n._('Coolant'), value: modal.coolant },
            ]}
          />
        </Disclosure>
      </Stack>
    </Surface>
  );
};

/** One of the controller's two queues, as a figure and a bar under it. */
const Buffer = ({ label, value, max }) => (
  <Stack>
    <Readout label={label} value={value} />
    <ProgressBar percent={bufferPercent(value, max)} label={label} />
  </Stack>
);

export default MachinePanel;
