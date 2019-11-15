import express from 'express';
import * as version from '../api/api.version';
import * as state from '../api/api.state';
import * as gcode from '../api/api.gcode';
import * as controllers from '../api/api.controllers';
import * as watch from '../api/api.watch';
import * as commands from '../api/api.commands';
import * as events from '../api/api.events';
import * as machines from '../api/api.machines';
import * as macros from '../api/api.macros';
import * as mdi from '../api/api.mdi';
import * as users from '../api/api.users';

const createAPIRouter = () => {
    const router = express.Router();

    //
    // Register API routes with public access
    //
    router.post('/api/signin', users.signin);

    //
    // Register API routes with authorized access
    //

    // Version
    router.get('/api/version/latest', version.getLatestVersion);

    // State
    router.get('/api/state', state.get);
    router.post('/api/state', state.set);
    router.delete('/api/state', state.unset);

    // G-code
    router.get('/api/gcode', gcode.fetch);
    router.post('/api/gcode', gcode.upload);
    router.get('/api/gcode/download', gcode.download);
    router.post('/api/gcode/download', gcode.download); // Alias

    // Controllers
    router.get('/api/controllers', controllers.get);

    // Commands
    router.get('/api/commands', commands.fetch);
    router.post('/api/commands', commands.create);
    router.get('/api/commands/:id', commands.read);
    router.put('/api/commands/:id', commands.update);
    router.delete('/api/commands/:id', commands.__delete);
    router.post('/api/commands/run/:id', commands.run);

    // Events
    router.get('/api/events', events.fetch);
    router.post('/api/events/', events.create);
    router.get('/api/events/:id', events.read);
    router.put('/api/events/:id', events.update);
    router.delete('/api/events/:id', events.__delete);

    // Machines
    router.get('/api/machines', machines.fetch);
    router.post('/api/machines', machines.create);
    router.get('/api/machines/:id', machines.read);
    router.put('/api/machines/:id', machines.update);
    router.delete('/api/machines/:id', machines.__delete);

    // Macros
    router.get('/api/macros', macros.fetch);
    router.post('/api/macros', macros.create);
    router.get('/api/macros/:id', macros.read);
    router.put('/api/macros/:id', macros.update);
    router.delete('/api/macros/:id', macros.__delete);

    // MDI
    router.get('/api/mdi', mdi.fetch);
    router.post('/api/mdi', mdi.create);
    router.put('/api/mdi', mdi.bulkUpdate);
    router.get('/api/mdi/:id', mdi.read);
    router.put('/api/mdi/:id', mdi.update);
    router.delete('/api/mdi/:id', mdi.__delete);

    // Users
    router.get('/api/users', users.fetch);
    router.post('/api/users/', users.create);
    router.get('/api/users/:id', users.read);
    router.put('/api/users/:id', users.update);
    router.delete('/api/users/:id', users.__delete);

    // Watch
    router.get('/api/watch/files', watch.getFiles);
    router.post('/api/watch/files', watch.getFiles);
    router.get('/api/watch/file', watch.readFile);
    router.post('/api/watch/file', watch.readFile);

    return router;
};

export { createAPIRouter };
