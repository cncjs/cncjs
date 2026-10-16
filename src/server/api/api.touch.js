import touch from '../services/touch';
import {
  ERR_BAD_REQUEST,
  ERR_UNAUTHORIZED,
  ERR_CONFLICT,
  ERR_INTERNAL_SERVER_ERROR,
  ERR_SERVICE_UNAVAILABLE
} from '../constants';

// express-jwt populates req.user, but the error handler in app.js lets
// unauthenticated requests through in development mode. These routes can move
// a machine, so every one of them re-checks the session itself.
const authorized = (handler) => (req, res) => {
  if (!req.user || typeof req.user !== 'object') {
    res.status(ERR_UNAUTHORIZED).send({ message: 'Session CNCjs requise.' });
    return;
  }
  if (!touch.isStarted()) {
    res.status(ERR_SERVICE_UNAVAILABLE).send({ message: 'Suivi indisponible.' });
    return;
  }
  handler(req, res);
};

export const getHealth = authorized((req, res) => {
  res.send({ loaded: true, version: touch.VERSION, protocol: 1, transport: 'ndjson' });
});

export const getJob = authorized((req, res) => {
  try {
    res.send(touch.snapshot());
  } catch (err) {
    res.status(ERR_INTERNAL_SERVER_ERROR).send({ message: 'État indisponible.' });
  }
});

export const postJob = authorized((req, res) => {
  touch.action(req.body)
    .then((result) => {
      res.send({ ...result, snapshot: touch.snapshot() });
      touch.publish();
    })
    .catch((err) => {
      res.status(err.status || ERR_BAD_REQUEST).send({ message: err.message });
    });
});

export const previewMotion = authorized((req, res) => {
  try {
    res.send(touch.previewMotion(req.body));
  } catch (err) {
    // A coded error names what blocks the dry run; anything else is a server fault.
    if (err.code) {
      res.status(ERR_CONFLICT).send({ message: err.message });
    } else {
      res.status(ERR_INTERNAL_SERVER_ERROR).send({ message: 'Vérification serveur indisponible.' });
    }
  }
});

export const getEvents = authorized((req, res) => {
  if (!touch.openEvents(req, res)) {
    res.status(ERR_SERVICE_UNAVAILABLE).send({ message: 'Suivi indisponible.' });
  }
});

// Read-only figures about the computer running CNCjs (settings screen).
export const getSystem = authorized((req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.send(touch.systemStats());
  } catch (err) {
    res.status(ERR_INTERNAL_SERVER_ERROR).send({ message: 'Mesures système indisponibles.' });
  }
});
