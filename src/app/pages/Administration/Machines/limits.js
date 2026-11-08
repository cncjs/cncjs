import i18n from '@app/lib/i18n';

export const MACHINE_PROFILE_LIMIT_FIELDS = [
  { key: 'xmin', axis: 'X', bound: 'min' },
  { key: 'xmax', axis: 'X', bound: 'max' },
  { key: 'ymin', axis: 'Y', bound: 'min' },
  { key: 'ymax', axis: 'Y', bound: 'max' },
  { key: 'zmin', axis: 'Z', bound: 'min' },
  { key: 'zmax', axis: 'Z', bound: 'max' },
];

export const DEFAULT_MACHINE_PROFILE_LIMITS = {
  xmin: 0,
  xmax: 0,
  ymin: 0,
  ymax: 0,
  zmin: 0,
  zmax: 0,
};

/**
 * @param {object} values
 * @returns {object}
 */
export const normalizeMachineProfileLimits = (values = {}) => Object.fromEntries(
  MACHINE_PROFILE_LIMIT_FIELDS.map(({ key }) => [key, Number(values[key])]),
);

/**
 * @param {unknown} value
 * @returns {string|undefined}
 */
const validateLimit = value => (
  value === undefined || value === null || value === '' || !Number.isFinite(Number(value))
    ? i18n._('Enter a valid finite number.')
    : undefined
);

/**
 * @param {object} values
 * @returns {object}
 */
export const validateMachineProfileLimits = (values = {}) => {
  const limits = values.limits || {};
  const errors = { limits: {} };

  MACHINE_PROFILE_LIMIT_FIELDS.forEach(({ key }) => {
    const error = validateLimit(limits[key]);
    if (error) {
      errors.limits[key] = error;
    }
  });

  [['xmin', 'xmax'], ['ymin', 'ymax'], ['zmin', 'zmax']].forEach(([minKey, maxKey]) => {
    if (
      !errors.limits[minKey] &&
      !errors.limits[maxKey] &&
      Number(limits[minKey]) > Number(limits[maxKey])
    ) {
      errors.limits[maxKey] = i18n._('Maximum must be greater than or equal to minimum.');
    }
  });

  return Object.keys(errors.limits).length > 0 ? errors : {};
};

/**
 * @param {string} axis
 * @param {string} bound
 * @returns {string}
 */
export const getMachineProfileLimitLabel = (axis, bound) => {
  const isMin = bound === 'min';

  if (axis === 'X') {
    return isMin ? i18n._('X min') : i18n._('X max');
  }
  if (axis === 'Y') {
    return isMin ? i18n._('Y min') : i18n._('Y max');
  }
  return isMin ? i18n._('Z min') : i18n._('Z max');
};
