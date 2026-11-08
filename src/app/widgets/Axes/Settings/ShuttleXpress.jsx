import {
  Box,
  Dropdown,
  DropdownButton,
  TextLabel,
} from '@tonic-ui/react';
import Slider from 'rc-slider';
import React from 'react';
import i18n from '@app/lib/i18n';
import sliderStyles from './sliderStyles';

const FEEDRATE_RANGE = [100, 2500];
const FEEDRATE_STEP = 50;
const OVERSHOOT_RANGE = [1, 1.5];
const OVERSHOOT_STEP = 0.01;
const HERTZ_OPTIONS = [
  [60, '60 Times per Second'],
  [45, '45 Times per Second'],
  [30, '30 Times per Second'],
  [15, '15 Times per Second'],
  [10, '10 Times per Second'],
  [5, '5 Times per Second'],
  [2, '2 Times per Second'],
  [1, 'Once Every Second'],
];

/**
 * @param {{
 *   value: {
 *     feedrateMin: number,
 *     feedrateMax: number,
 *     hertz: number,
 *     overshoot: number
 *   },
 *   onChange: (value: object) => void
 * }} props
 * @returns {JSX.Element}
 */
function ShuttleXpress({ value, onChange }) {
  const update = nextValue => onChange({ ...value, ...nextValue });
  const hertzOptions = HERTZ_OPTIONS.map(([hertz, label]) => ({ value: hertz, label: i18n._(label) }));

  return (
    <Box>
      <Box mb="4x">
        <TextLabel mb="2x">
          {i18n._('Feed Rate Range: {{min}} - {{max}} mm/min', {
            min: value.feedrateMin,
            max: value.feedrateMax,
          })}
        </TextLabel>
        <Box sx={sliderStyles}>
          <Slider.Range
            ariaLabelGroupForHandles={[
              i18n._('Minimum feed rate'),
              i18n._('Maximum feed rate'),
            ]}
            allowCross={false}
            value={[value.feedrateMin, value.feedrateMax]}
            min={FEEDRATE_RANGE[0]}
            max={FEEDRATE_RANGE[1]}
            step={FEEDRATE_STEP}
            onChange={([feedrateMin, feedrateMax]) => update({ feedrateMin, feedrateMax })}
          />
        </Box>
      </Box>
      <Box mb="4x">
        <TextLabel mb="2x">
          {i18n._('Repeat Rate: {{hertz}}Hz', { hertz: value.hertz })}
        </TextLabel>
        <Dropdown
          matchWidth
          items={hertzOptions}
          value={hertzOptions.find(option => option.value === value.hertz) || null}
          renderItem={option => option?.label ?? ''}
          renderToggle={({ renderItem, value: selected }) => (
            <DropdownButton
              aria-label={i18n._('Repeat Rate')}
              width="100%"
              variant="secondary"
              justifyContent="space-between"
            >
              {renderItem(selected)}
            </DropdownButton>
          )}
          onChange={option => update({ hertz: Number(option?.value) })}
        />
      </Box>
      <Box>
        <TextLabel mb="2x">
          {i18n._('Distance Overshoot: {{overshoot}}x', { overshoot: value.overshoot })}
        </TextLabel>
        <Box sx={sliderStyles}>
          <Slider
            ariaLabelForHandle={i18n._('Distance Overshoot')}
            value={value.overshoot}
            min={OVERSHOOT_RANGE[0]}
            max={OVERSHOOT_RANGE[1]}
            step={OVERSHOOT_STEP}
            onChange={overshoot => update({ overshoot })}
          />
        </Box>
      </Box>
    </Box>
  );
}

export default ShuttleXpress;
