import superagent from 'superagent';
import superagentUse from 'superagent-use';
import store from '../store';

const bearer = (request) => {
    const token = store.get('session.token');
    if (token) {
        request.set('Authorization', 'Bearer ' + token);
    }
};

const authrequest = superagentUse(superagent);
authrequest.use(bearer);

//
// Authentication
//
const signin = (options) => new Promise((resolve, reject) => {
    const { token, name, password } = { ...options };

    authrequest
        .post('/api/signin')
        .send({ token, name, password })
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

//
// Latest Version
//
const getLatestVersion = () => new Promise((resolve, reject) => {
    authrequest
        .get('/api/version/latest')
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

//
// Controllers
//
const listControllers = () => new Promise((resolve, reject) => {
    authrequest
        .get('/api/controllers')
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

//
// State
//
const getState = (options) => new Promise((resolve, reject) => {
    const { key } = { ...options };

    authrequest
        .get('/api/state')
        .query({ key: key })
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

const setState = (options) => new Promise((resolve, reject) => {
    const data = { ...options };

    authrequest
        .post('/api/state')
        .send(data)
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

const unsetState = (options) => new Promise((resolve, reject) => {
    const { key } = { ...options };

    authrequest
        .delete('/api/state')
        .query({ key: key })
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

//
// G-code
//
const loadGCode = (options) => new Promise((resolve, reject) => {
    const { port = '', name = '', gcode = '' } = { ...options };
    const meta = {
        name: name,
        size: gcode.length
    };

    authrequest
        .post('/api/gcode')
        .send({
            port: port,
            meta: meta,
            gcode: gcode
        })
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

const fetchGCode = (options) => new Promise((resolve, reject) => {
    const { port = '' } = { ...options };

    authrequest
        .get('/api/gcode')
        .query({ port: port })
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

//
// Users
//
const users = {};

users.fetch = (options) => new Promise((resolve, reject) => {
    authrequest
        .get('/api/users')
        .query({ ...options })
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

users.create = (options) => new Promise((resolve, reject) => {
    const { enabled, name, password } = { ...options };

    authrequest
        .post('/api/users')
        .send({ enabled, name, password })
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

users.delete = (id) => new Promise((resolve, reject) => {
    authrequest
        .delete('/api/users/' + id)
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

users.update = (id, options) => new Promise((resolve, reject) => {
    const { enabled, name, oldPassword, newPassword } = { ...options };

    authrequest
        .put('/api/users/' + id)
        .send({ enabled, name, oldPassword, newPassword })
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

//
// Events
//
const events = {};

events.fetch = (options) => new Promise((resolve, reject) => {
    authrequest
        .get('/api/events')
        .query({ ...options })
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

events.create = (options) => new Promise((resolve, reject) => {
    const { enabled, event, trigger, commands } = { ...options };

    authrequest
        .post('/api/events')
        .send({ enabled, event, trigger, commands })
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

events.delete = (id) => new Promise((resolve, reject) => {
    authrequest
        .delete('/api/events/' + id)
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

events.update = (id, options) => new Promise((resolve, reject) => {
    const { enabled, event, trigger, commands } = { ...options };

    authrequest
        .put('/api/events/' + id)
        .send({ enabled, event, trigger, commands })
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

//
// Macros
//
const macros = {};

macros.fetch = () => new Promise((resolve, reject) => {
    authrequest
        .get('/api/macros')
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

macros.get = (id) => new Promise((resolve, reject) => {
    authrequest
        .get('/api/macros/' + id)
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

macros.create = (options) => new Promise((resolve, reject) => {
    const { name, content } = { ...options };

    authrequest
        .post('/api/macros')
        .send({ name, content })
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

macros.update = (id, options) => new Promise((resolve, reject) => {
    const { name, content } = { ...options };

    authrequest
        .put('/api/macros/' + id)
        .send({ name, content })
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

macros.delete = (id) => new Promise((resolve, reject) => {
    authrequest
        .delete('/api/macros/' + id)
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

// Commands
const commands = {};

commands.getCommands = (options) => new Promise((resolve, reject) => {
    authrequest
        .get('/api/commands')
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

commands.runCommand = (options) => new Promise((resolve, reject) => {
    const { id } = { ...options };

    authrequest
        .post('/api/commands/run')
        .send({ id })
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

// Watch Directory
const watch = {};

watch.getFiles = (options) => new Promise((resolve, reject) => {
    const { path } = { ...options };

    authrequest
        .post('/api/watch/files')
        .send({ path })
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

watch.readFile = (options) => new Promise((resolve, reject) => {
    const { file } = { ...options };

    authrequest
        .post('/api/watch/file')
        .send({ file })
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

export default {
    getLatestVersion,
    listControllers,
    // State
    getState,
    setState,
    unsetState,
    // G-code
    loadGCode,
    fetchGCode,

    signin,
    users, // Users
    events, // Events
    macros, // Macros
    commands, // Commands
    watch // Watch Directory
};
