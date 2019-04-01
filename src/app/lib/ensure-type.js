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
