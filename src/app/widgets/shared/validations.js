import i18n from 'app/lib/i18n';

export const required = value => (value ? undefined : i18n._('This field is required.'));
export const minValue = min => value => ((Number.isNaN(value) || value >= min) ? undefined : i18n._('Should be greater than or equal to {{min}}', { min }));
export const maxValue = max => value => ((Number.isNaN(value) || value <= max) ? undefined : i18n._('Should be less than or equal to {{max}}', { max }));
export const composeValidators = (...validators) => value => validators.reduce((error, validator) => error || validator(value), undefined);
