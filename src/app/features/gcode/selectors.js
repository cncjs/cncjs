import moment from 'moment';
import { NO_READING } from 'app/lib/reading';
import { mapPositionToUnits } from 'app/lib/units';

// Re-exported because this module's callers have always taken it from here.
// It moved to `app/lib/reading` when the Grbl panel needed the same dash.
export { NO_READING };

const pad = (value) => String(value).padStart(2, '0');

/**
 * How far through the job the machine is, as a whole percent.
 *
 * Driven by **received**, not sent. `sent` counts lines handed to the
 * controller, which runs several seconds behind while its planner buffer
 * drains — a bar driven by it reads ahead of the tool and reaches 100% with
 * the job still cutting. `received` counts lines the controller acknowledged.
 */
export const jobProgress = ({ received = 0, total = 0 } = {}) => {
  if (!(total > 0)) {
    return 0;
  }
  return Math.min(100, Math.round((received / total) * 100));
};

/** `4812 / 11430`, or nothing at all when there is no job. */
export const formatCount = (done, total) => {
  if (!(total > 0)) {
    return NO_READING;
  }
  return `${done} / ${total}`;
};

/**
 * A span of time as HH:mm:ss.
 *
 * Computed arithmetically rather than through `moment(duration._data)`, which
 * is what this replaced: that reaches into a private field, and it silently
 * drops whole days rather than counting past 24 hours.
 */
export const formatDuration = (milliseconds) => {
  if (!milliseconds || milliseconds < 0) {
    return NO_READING;
  }
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

/** A wall-clock moment, or nothing when it has not happened. */
export const formatTimestamp = (milliseconds) => {
  if (!milliseconds || milliseconds <= 0) {
    return NO_READING;
  }
  return moment.unix(milliseconds / 1000).format('YYYY-MM-DD HH:mm:ss');
};

/**
 * The bounding box as one row per axis: min, max and the span between them.
 *
 * The span is derived here rather than carried alongside the other two, so it
 * cannot drift out of agreement with them.
 */
export const dimensionRows = (bbox, units) => ['x', 'y', 'z'].map((axis) => {
  const min = Number(bbox.min[axis]) || 0;
  const max = Number(bbox.max[axis]) || 0;
  return [
    axis.toUpperCase(),
    mapPositionToUnits(min, units),
    mapPositionToUnits(max, units),
    mapPositionToUnits(max - min, units),
  ];
});
