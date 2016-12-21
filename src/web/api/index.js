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
const listUsers = (options) => new Promise((resolve, reject) => {
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

const addUser = (options) => new Promise((resolve, reject) => {
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

const deleteUser = (options) => new Promise((resolve, reject) => {
    const { id } = { ...options };

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

const editUser = (options) => new Promise((resolve, reject) => {
    const { id, enabled, name, oldPassword, newPassword } = { ...options };

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
// Macros
//
const listMacros = () => new Promise((resolve, reject) => {
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

const getMacro = (options) => new Promise((resolve, reject) => {
    const { id } = { ...options };

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

const addMacro = (options) => new Promise((resolve, reject) => {
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

const updateMacro = (options) => new Promise((resolve, reject) => {
    const { id, name, content } = { ...options };

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

const deleteMacro = (options) => new Promise((resolve, reject) => {
    const { id } = { ...options };

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
    // Users
    signin,
    listUsers,
    addUser,
    deleteUser,
    editUser,
    // Macros
    listMacros,
    getMacro,
    addMacro,
    updateMacro,
    deleteMacro,
    // Watch Directory
    watch: watch
};
