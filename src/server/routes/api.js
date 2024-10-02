import express from 'express';
import commands from '../api/api.commands';
import controllers from '../api/api.controllers';
import events from '../api/api.events';
import gcode from '../api/api.gcode';
import machines from '../api/api.machines';
import macros from '../api/api.macros';
import mdi from '../api/api.mdi';
import state from '../api/api.state';
import system from '../api/api.system';
import users from '../api/api.users';
import version from '../api/api.version';
import watch from '../api/api.watch';

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
  router.delete('/commands', commands.bulkDelete);
  router.get('/commands/:id', commands.read);
  router.put('/commands/:id', commands.update);
  router.delete('/commands/:id', commands.delete);
  router.post('/commands/:id/run', commands.run);
  router.post('/commands/:id/enable', commands.enable);
  router.post('/commands/:id/disable', commands.disable);

  // Controllers
  router.get('/controllers', controllers.get);

  // Events
  router.get('/events', events.fetch);
  router.post('/events/', events.create);
  router.delete('/events/', events.bulkDelete);
  router.put('/events/:id', events.update);
  router.delete('/events/:id', events.delete);
  router.post('/events/:id/enable', events.enable);
  router.post('/events/:id/disable', events.disable);

  // G-code
  router.get('/gcode', gcode.fetch);
  router.post('/gcode', gcode.upload);
  router.get('/gcode/download', gcode.download);
  router.post('/gcode/download', gcode.download); // Alias

  // Machines
  router.get('/machines', machines.fetch);
  router.post('/machines', machines.create);
  router.delete('/machines', machines.bulkDelete);
  router.get('/machines/:id', machines.read);
  router.put('/machines/:id', machines.update);
  router.delete('/machines/:id', machines.delete);

  // Macros
  router.get('/macros', macros.fetch);
  router.post('/macros/export', macros.exportCSV);
  router.post('/macros', macros.create);
  router.delete('/macros', macros.bulkDelete);
  router.get('/macros/:id', macros.read);
  router.put('/macros/:id', macros.update);
  router.delete('/macros/:id', macros.delete);

  // MDI
  router.get('/mdi', mdi.fetch);
  router.post('/mdi', mdi.create);
  router.delete('/mdi', mdi.bulkDelete);
  router.put('/mdi', mdi.bulkUpdate);
  router.get('/mdi/:id', mdi.read);
  router.put('/mdi/:id', mdi.update);
  router.delete('/mdi/:id', mdi.delete);

  // State
  router.get('/state', state.get);
  router.post('/state', state.set);
  router.delete('/state', state.unset);

  // System
  router.get('/system/info', system.getInformation);

  // Users
  router.get('/users', users.fetch);
  router.post('/users/', users.create);
  router.delete('/users/', users.bulkDelete);
  router.get('/users/:id', users.read);
  router.put('/users/:id', users.update);
  router.delete('/users/:id', users.delete);
  router.post('/users/:id/enable', users.enable);
  router.post('/users/:id/disable', users.disable);

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
