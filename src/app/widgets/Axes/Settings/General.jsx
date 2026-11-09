import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Button,
  Checkbox,
  Grid,
  Input,
  Space,
  TextLabel,
} from '@tonic-ui/react';
import React from 'react';
import i18n from '@app/lib/i18n';

const AXES = ['x', 'y', 'z', 'a', 'b', 'c'];
const AXIS_LABELS = {
  x: 'X-axis',
  y: 'Y-axis',
  z: 'Z-axis',
  a: 'A-axis',
  b: 'B-axis',
  c: 'C-axis',
};
const IMPERIAL_JOG_DISTANCES_MAX = 5;
const METRIC_JOG_DISTANCES_MAX = 5;

/**
 * @param {{
 *   value: {
 *     axes: string[],
 *     imperialJogDistances: Array<string|number>,
 *     metricJogDistances: Array<string|number>
 *   },
 *   onChange: (value: object) => void
 * }} props
 * @returns {JSX.Element}
 */
function General({ value, onChange }) {
  const update = nextValue => onChange({ ...value, ...nextValue });
  const toggleAxis = axis => (event) => {
    const axes = value.axes.filter(currentAxis => currentAxis !== axis);

    if (event.target.checked) {
      axes.push(axis);
    }

    update({ axes: AXES.filter(currentAxis => currentAxis === 'x' || axes.includes(currentAxis)) });
  };
  const updateDistance = (unit, index) => (event) => {
    const key = unit === 'metric' ? 'metricJogDistances' : 'imperialJogDistances';
    const distances = value[key].map((distance, distanceIndex) => (
      distanceIndex === index ? event.target.value : distance
    ));

    update({ [key]: distances });
  };
  const addDistance = unit => () => {
    const key = unit === 'metric' ? 'metricJogDistances' : 'imperialJogDistances';
    update({ [key]: value[key].concat('') });
  };
  const removeDistance = (unit, index) => () => {
    const key = unit === 'metric' ? 'metricJogDistances' : 'imperialJogDistances';
    update({ [key]: value[key].filter((distance, distanceIndex) => distanceIndex !== index) });
  };
  const renderDistanceEditor = (unit, label, distances, max) => {
    const keyCounts = {};

    return (
      <Box>
        <TextLabel mb="2x">{label}</TextLabel>
        <Box>
          {distances.map((distance, index) => {
            const occurrence = keyCounts[distance] || 0;
            keyCounts[distance] = occurrence + 1;

            return (
              <Grid
                key={`${unit}-${String(distance)}-${occurrence}`}
                templateColumns="1fr auto"
                gap="2x"
                mb="2x"
              >
                <Input
                  aria-label={`${label} ${index + 1}`}
                  type="number"
                  value={distance}
                  onChange={updateDistance(unit, index)}
                />
                <Button
                  aria-label={i18n._('Remove')}
                  size="sm"
                  onClick={removeDistance(unit, index)}
                >
                  <FontAwesomeIcon icon="times" />
                </Button>
              </Grid>
            );
          })}
          {distances.length < max && (
            <Button onClick={addDistance(unit)}>
              <FontAwesomeIcon icon="plus" />
              <Space width="2x" />
              {i18n._('Add')}
            </Button>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box>
      <TextLabel mb="2x">{i18n._('Axes')}</TextLabel>
      <Grid templateColumns="repeat(3, minmax(0, 1fr))" gap="2x" mb="4x">
        {AXES.map(axis => (
          <Checkbox
            key={axis}
            checked={value.axes.includes(axis)}
            disabled={axis === 'x'}
            onChange={toggleAxis(axis)}
          >
            {i18n._(AXIS_LABELS[axis])}
          </Checkbox>
        ))}
      </Grid>
      <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap="4x">
        {renderDistanceEditor(
          'metric',
          i18n._('Custom Jog Distance (mm)'),
          value.metricJogDistances,
          METRIC_JOG_DISTANCES_MAX
        )}
        {renderDistanceEditor(
          'imperial',
          i18n._('Custom Jog Distance (inches)'),
          value.imperialJogDistances,
          IMPERIAL_JOG_DISTANCES_MAX
        )}
      </Grid>
    </Box>
  );
}

export default General;
