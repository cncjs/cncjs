import express from 'express';
import * as commands from '../api/api.commands';
import * as controllers from '../api/api.controllers';
import * as events from '../api/api.events';
import * as gcode from '../api/api.gcode';
import * as machines from '../api/api.machines';
import * as macros from '../api/api.macros';
import * as mdi from '../api/api.mdi';
import * as state from '../api/api.state';
import * as system from '../api/api.system';
import * as users from '../api/api.users';
import * as version from '../api/api.version';
import * as watch from '../api/api.watch';

const createPublicApiRouter = () => {
  const router = express.Router();

  router.post('/signin', users.signin);

  return router;
};

const createProtectedApiRouter = () => {
  const router = express.Router();

  // Commands
  router.get('/commands', commands.fetch);
  router.post('/commands', commands.create);
  router.get('/commands/:id', commands.read);
  router.put('/commands/:id', commands.update);
  router.delete('/commands/:id', commands.__delete);
  router.post('/commands/run/:id', commands.run);

  // Controllers
  router.get('/controllers', controllers.get);

  // Events
  router.get('/events', events.fetch);
  router.post('/events/', events.create);
  router.get('/events/:id', events.read);
  router.put('/events/:id', events.update);
  router.delete('/events/:id', events.__delete);

  // G-code
  router.get('/gcode', gcode.fetch);
  router.post('/gcode', gcode.upload);
  router.get('/gcode/download', gcode.download);
  router.post('/gcode/download', gcode.download); // Alias

  // Machines
  router.get('/machines', machines.fetch);
  router.post('/machines', machines.create);
  router.get('/machines/:id', machines.read);
  router.put('/machines/:id', machines.update);
  router.delete('/machines/:id', machines.__delete);

  // Macros
  router.get('/macros', macros.fetch);
  router.post('/macros/export', macros.__export);
  router.post('/macros', macros.create);
  router.get('/macros/:id', macros.read);
  router.put('/macros/:id', macros.update);
  router.delete('/macros/:id', macros.__delete);

  // MDI
  router.get('/mdi', mdi.fetch);
  router.post('/mdi', mdi.create);
  router.put('/mdi', mdi.bulkUpdate);
  router.get('/mdi/:id', mdi.read);
  router.put('/mdi/:id', mdi.update);
  router.delete('/mdi/:id', mdi.__delete);

  // State
  router.get('/state', state.get);
  router.post('/state', state.set);
  router.delete('/state', state.unset);

  // System
  router.get('/system/info', system.getInformation);

  // Users
  router.get('/users', users.fetch);
  router.post('/users/', users.create);
  router.get('/users/:id', users.read);
  router.put('/users/:id', users.update);
  router.delete('/users/:id', users.__delete);

  // Version
  router.get('/version/latest', version.getLatestVersion);

  // Watch
  router.get('/watch/files', watch.getFiles);
  router.post('/watch/files', watch.getFiles);
  router.get('/watch/file', watch.readFile);
  router.post('/watch/file', watch.readFile);

  return router;
};

export {
  createPublicApiRouter,
  createProtectedApiRouter,
};
