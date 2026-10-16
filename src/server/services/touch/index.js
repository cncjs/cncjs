// Touch service: the job service and its NDJSON event stream for the
// experimental touchscreen interface (see examples/cncjs-touch).
import store from '../../store';
import config from '../configstore';
import { createService } from './job-service';
import { createStream, VERSION } from './touch-stream';
import { createSystemStats } from './system-stats';

let service = null;
let stream = null;
let system = null;

const start = () => {
  if (stream) {
    return;
  }
  service = createService(store, config);
  stream = createStream(service);
  system = createSystemStats();
};

const stop = () => {
  if (!stream) {
    return;
  }
  stream.dispose(); // also disposes the service
  stream = null;
  service = null;
  system = null;
};

const isStarted = () => Boolean(stream);

const snapshot = () => stream.snapshot();

const publish = () => stream.publish();

const action = (body) => service.action(body);

const previewMotion = (body) => service.previewMotion(body);

const openEvents = (req, res) => stream.open(req, res);

const systemStats = () => system.read();

export default {
  VERSION,
  start,
  stop,
  isStarted,
  snapshot,
  publish,
  action,
  previewMotion,
  openEvents,
  systemStats
};
