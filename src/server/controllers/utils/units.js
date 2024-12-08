import {
  IMPERIAL_UNITS,
  METRIC_UNITS
} from '../constants';

// Converts value from millimeters to inches
export const mm2in = (val = 0) => val / 25.4;

// Converts values from inches to millimeters
export const in2mm = (val = 0) => val * 25.4;

// Maps value to imperial units
export const mapValueToImperialUnits = (val) => {
  val = Number(val) || 0;
  return mm2in(val).toFixed(4) * 1;
};

// Maps value to metric units
export const mapValueToMetricUnits = (val) => {
  val = Number(val) || 0;
  return val.toFixed(3) * 1;
};

// Maps value to the specified units
// in: 0.10203 -> "0.102"
// mm: 0.10002 -> "0.1"
export const mapValueToUnits = (val, units = METRIC_UNITS) => {
  if (units === IMPERIAL_UNITS) {
    return mapValueToImperialUnits(val);
  }
  if (units === METRIC_UNITS) {
    return mapValueToMetricUnits(val);
  }
  return Number(val) || 0;
};

// Maps position to imperial units
export const mapPositionToImperialUnits = (pos) => {
  pos = Number(pos) || 0;
  return mm2in(pos).toFixed(4);
};

// Maps position to metric units
export const mapPositionToMetricUnits = (pos) => {
  pos = Number(pos) || 0;
  return pos.toFixed(3);
};

// Maps position to the specified units
// in: 0.12345 > "0.1235"
// mm: 0.1234  > "0.123"
export const mapPositionToUnits = (pos, units = METRIC_UNITS) => {
  if (units === IMPERIAL_UNITS) {
    return mapPositionToImperialUnits(pos);
  }
  if (units === METRIC_UNITS) {
    return mapPositionToMetricUnits(pos);
  }
  return Number(pos) || 0;
};
