import { ensureArray } from 'ensure-type';
import { DEFAULT_AXES } from '../constants';

const AXIS_ORDER = ['x', 'y', 'z', 'a', 'b', 'c'];

/**
 * @param {unknown} value
 * @returns {number[]}
 */
const normalizeDistances = (value) => ensureArray(value).reduce((distances, entry) => {
  const distance = Number(entry);

  if (distance > 0) {
    distances.push(distance);
  }

  return distances;
}, []);

/**
 * @param {{ axes?: unknown, imperialJogDistances?: unknown, metricJogDistances?: unknown }} general
 * @returns {{ axes: string[], imperialJogDistances: number[], metricJogDistances: number[] }}
 */
export const normalizeGeneral = (general = {}) => {
  const axes = ensureArray(general.axes);

  return {
    axes: AXIS_ORDER.filter(axis => axis === 'x' || axes.includes(axis)),
    imperialJogDistances: normalizeDistances(general.imperialJogDistances),
    metricJogDistances: normalizeDistances(general.metricJogDistances)
  };
};

/**
 * @param {{ get: (key: string, fallback?: unknown) => unknown }} config
 * @param {Array<Record<string, unknown>>} mdiRecords
 * @returns {{
 *   general: {
 *     axes: unknown[],
 *     imperialJogDistances: unknown[],
 *     metricJogDistances: unknown[]
 *   },
 *   shuttleXpress: {
 *     feedrateMin: unknown,
 *     feedrateMax: unknown,
 *     hertz: unknown,
 *     overshoot: unknown
 *   },
 *   mdiRecords: Array<Record<string, unknown>>
 * }}
 */
export const createSettingsDraft = (config, mdiRecords = []) => ({
  general: {
    axes: ensureArray(config.get('axes', DEFAULT_AXES)),
    imperialJogDistances: ensureArray(config.get('jog.imperial.distances', [])),
    metricJogDistances: ensureArray(config.get('jog.metric.distances', []))
  },
  shuttleXpress: {
    feedrateMin: config.get('shuttle.feedrateMin'),
    feedrateMax: config.get('shuttle.feedrateMax'),
    hertz: config.get('shuttle.hertz'),
    overshoot: config.get('shuttle.overshoot')
  },
  mdiRecords: ensureArray(mdiRecords).map(record => ({ ...record }))
});
