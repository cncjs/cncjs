// Normalize the value by bringing it within the range.
// If value is greater than max, max will be returned.
// If value is less than min, min will be returned.
// Otherwise, value is returned unaltered. Both ends of this range are inclusive.
export const limit = (value, min, max) => {
    return Math.max(min, Math.min(max, value));
};

// Returns true if value is within the range, false otherwise.
// It defaults to inclusive on both ends of the range, but that can be changed by
// setting minExclusive and/or maxExclusive to a truthy value.
export const test = (value, min, max, minExclusive, maxExclusive) => {
    return !(
        value < min ||
        value > max ||
        (maxExclusive && (value === max)) ||
        (minExclusive && (value === min))
    );
};

export default {
    limit,
    test
};
