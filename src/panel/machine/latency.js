import controller from './controller';

/**
 * How long it takes to get a word to the server, in milliseconds.
 *
 * **Releasing a key is not free when the server is somewhere else.** This is
 * meant to run both ways: everything on one computer, where this measures as
 * nothing, or a mini PC by the machine with the panel on a laptop across the
 * workshop, where letting go of a key crosses a network before it reaches the
 * serial port. The machine keeps moving for the whole of that crossing, so it
 * is part of the stopping distance exactly as much as the planner queue is.
 *
 * Measured over the socket that carries the jog commands, because that is the
 * connection a stop actually travels on. An HTTP request would time a
 * different one.
 *
 * Only half the round trip counts: a stop has to get *there*, and nothing has
 * to come back before the machine is told.
 */

/** How many round trips to time. */
const SAMPLES = 5;

/** How long to leave between them, so one busy moment is not the whole answer. */
const SPACING_MS = 120;

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const roundTrip = () => new Promise((resolve) => {
  const socket = controller.socket;

  if (!socket?.connected) {
    resolve(null);
    return;
  }

  const sentAt = Date.now();
  // A reply that never comes must not leave a promise hanging around for the
  // life of the panel.
  const giveUp = setTimeout(() => resolve(null), 2000);

  socket.emit('latency', () => {
    clearTimeout(giveUp);
    resolve(Date.now() - sentAt);
  });
});

/**
 * Time the link to the server.
 *
 * @returns {Promise<number|null>} One-way milliseconds, or null when the
 *   socket is not there to be measured — in which case the panel says
 *   nothing rather than assuming zero.
 */
export const measureLinkMs = async () => {
  const trips = [];

  for (let i = 0; i < SAMPLES; i += 1) {
    // Sequential on purpose: five at once would queue behind each other and
    // time the queue rather than the link.
    // eslint-disable-next-line no-await-in-loop
    const trip = await roundTrip();
    if (trip !== null) {
      trips.push(trip);
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => { setTimeout(resolve, SPACING_MS); });
  }

  if (!trips.length) {
    return null;
  }

  return median(trips) / 2;
};

export default measureLinkMs;
