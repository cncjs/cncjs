import request from 'superagent';

const getLatestVersion = () => new Promise((resolve, reject) => {
    request
        .get('/api/version/latest')
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

const listControllers = () => new Promise((resolve, reject) => {
    request
        .get('/api/controllers')
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

const loadGCode = (options) => new Promise((resolve, reject) => {
    const { port = '', name = '', gcode = '' } = { ...options };
    const meta = {
        name: name,
        size: gcode.length
    };

    request
        .put('/api/gcode')
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

    request
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
// Accounts
//
const listAccounts = (options) => new Promise((resolve, reject) => {
    request
        .get('/api/accounts')
        .query({ ...options })
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

const addAccount = (options) => new Promise((resolve, reject) => {
    const { enabled, name, password } = { ...options };

    request
        .post('/api/accounts')
        .send({ enabled, name, password })
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

const deleteAccount = (options) => new Promise((resolve, reject) => {
    const { id } = { ...options };

    request
        .delete('/api/accounts/' + id)
        .end((err, res) => {
            if (err) {
                reject(res);
            } else {
                resolve(res);
            }
        });
});

const editAccount = (options) => new Promise((resolve, reject) => {
    const { id, enabled, name, oldPassword, newPassword } = { ...options };

    request
        .put('/api/accounts/' + id)
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
    request
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

    request
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

    request
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

    request
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

    request
        .delete('/api/macros/' + id)
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
    // G-code
    loadGCode,
    fetchGCode,
    // Accounts
    listAccounts,
    addAccount,
    deleteAccount,
    editAccount,
    // Macros
    listMacros,
    getMacro,
    addMacro,
    updateMacro,
    deleteMacro
};
