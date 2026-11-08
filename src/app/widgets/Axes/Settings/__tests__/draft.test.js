import { createSettingsDraft, normalizeGeneral } from '../draft';

describe('normalizeGeneral', () => {
  test('preserves the configured axis order and filters non-positive jog values', () => {
    expect(normalizeGeneral({
      axes: ['z', 'y'],
      imperialJogDistances: ['', '0', '-1', '0.1'],
      metricJogDistances: ['5', '1']
    })).toEqual({
      axes: ['x', 'y', 'z'],
      imperialJogDistances: [0.1],
      metricJogDistances: [5, 1]
    });
  });

  test('keeps editable jog values in the draft while normalization converts them', () => {
    const config = {
      get: (key, fallback) => ({
        axes: ['x', 'a'],
        'jog.imperial.distances': ['', '0.25'],
        'jog.metric.distances': ['2']
      }[key] ?? fallback)
    };

    expect(createSettingsDraft(config, [{ id: 'mdi-1', name: 'Home' }])).toEqual({
      general: {
        axes: ['x', 'a'],
        imperialJogDistances: ['', '0.25'],
        metricJogDistances: ['2']
      },
      shuttleXpress: {
        feedrateMin: undefined,
        feedrateMax: undefined,
        hertz: undefined,
        overshoot: undefined
      },
      mdiRecords: [{ id: 'mdi-1', name: 'Home' }]
    });
  });

  test('always includes X and orders known axes consistently', () => {
    expect(normalizeGeneral({
      axes: ['c', 'a', 'x', 'b', 'x', 'unknown'],
      imperialJogDistances: [],
      metricJogDistances: []
    }).axes).toEqual(['x', 'a', 'b', 'c']);
  });

  test('uses the existing defaults when config values are absent', () => {
    const config = {
      get: (key, fallback) => fallback
    };

    expect(createSettingsDraft(config).general).toEqual({
      axes: ['x', 'y', 'z'],
      imperialJogDistances: [],
      metricJogDistances: []
    });
  });
});
