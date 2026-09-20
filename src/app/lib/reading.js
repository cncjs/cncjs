/**
 * What a reading says when there is nothing to say.
 *
 * Not "0", not "00:00:00", not an empty cell: those are readings, and they
 * describe a machine that reported something. A dash is the only one of the
 * four that is honest about a figure the controller never sent.
 *
 * It lives here rather than in one feature because two panels already show it
 * and a third would otherwise pick its own dash.
 */
export const NO_READING = '–';

export default NO_READING;
