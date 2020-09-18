import _trim from 'lodash/trim';
import i18n from 'app/lib/i18n';

export const required = value => {
  return _trim(value).length > 0
    ? undefined
    : i18n._('This field is required.');
};

export const minValue = min => value => {
  value = Number(value);

  return Number.isFinite(value) && value >= min
    ? undefined
    : i18n._('The value must be at least {{min}}.', { min });
};

export const maxValue = max => value => {
  value = Number(value);

  return Number.isFinite(value) && value <= max
    ? undefined
    : i18n._('The value must be less than or equal to {{max}}.', { max });
};

export const between = (min, max) => value => {
  value = Number(value);

  return Number.isFinite(value) && value >= min && value <= max
    ? undefined
    : i18n._('Specify a number between {{min}} and {{max}}.', { min, max });
};

export const composeValidators = (...validators) => value => validators.reduce((error, validator) => error || validator(value), undefined);
