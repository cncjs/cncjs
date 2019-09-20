export const ensureBoolean = (value, defaultValue = false) => {
    if (value === undefined || value === null) {
        return Boolean(defaultValue);
    }

    return (typeof value === 'boolean') ? value : Boolean(value);
};

export const ensureString = (value, defaultValue = '') => {
    if (value === undefined || value === null) {
        return String(defaultValue);
    }

    return (typeof value === 'string') ? value : String(value);
};

export const ensureNumber = (value, defaultValue = 0) => {
    if (value === undefined || value === null) {
        return Number(defaultValue);
    }

    return (typeof value === 'number') ? value : Number(value);
};

export const ensurePositiveNumber = (value, minimumValue = 0) => {
    // In comparison to the global isFinite() function, the Number.isFinite() method doesn't forcibly convert the parameter to a number.
    if (!Number.isFinite(minimumValue) || (minimumValue < 0)) {
        minimumValue = 0;
    }
    return Math.max(Number(value) || 0, minimumValue);
};
