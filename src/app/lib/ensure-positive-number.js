const ensurePositiveNumber = (value, minimumValue = 0) => {
    // In comparison to the global isFinite() function, the Number.isFinite() method doesn't forcibly convert the parameter to a number.
    if (!Number.isFinite(minimumValue) || (minimumValue < 0)) {
        minimumValue = 0;
    }
    return Math.max(Number(value) || 0, minimumValue);
};

export default ensurePositiveNumber;
