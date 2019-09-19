export const none = '–';

export const isNullOrEmpty = (val) => val === null || val === undefined || val === '';

export const nonblankValue = (value, defaultValue = none) => (isNullOrEmpty(value) ? defaultValue : value);
