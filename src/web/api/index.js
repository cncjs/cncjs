import request from 'superagent';

const getLatestVersion = () => new Promise((resolve, reject) => {
    request
        .get('/api/version/latest')
        .end((err, res) => {
            if (err || res.err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
});

const listControllers = () => new Promise((resolve, reject) => {
    request
        .get('/api/controllers')
        .end((err, res) => {
            if (err || res.err) {
                reject(err);
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
            if (err || res.err) {
                reject(err);
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
            if (err || res.err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
});

const listMacros = () => new Promise((resolve, reject) => {
    request
        .get('/api/macro')
        .end((err, res) => {
            if (err || res.err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
});

const getMacro = (options) => new Promise((resolve, reject) => {
    const { id } = { ...options };

    request
        .get('/api/macro/' + id)
        .end((err, res) => {
            if (err || res.err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
});

const addMacro = (options) => new Promise((resolve, reject) => {
    const { name, content } = { ...options };

    request
        .post('/api/macro')
        .send({ name, content })
        .end((err, res) => {
            if (err || res.err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
});

const updateMacro = (options) => new Promise((resolve, reject) => {
    const { id, name, content } = { ...options };

    request
        .put('/api/macro/' + id)
        .send({ name, content })
        .end((err, res) => {
            if (err || res.err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
});

const deleteMacro = (options) => new Promise((resolve, reject) => {
    const { id } = { ...options };

    request
        .delete('/api/macro/' + id)
        .end((err, res) => {
            if (err || res.err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
});

export default {
    getLatestVersion,
    listControllers,
    loadGCode,
    fetchGCode,
    listMacros,
    getMacro,
    addMacro,
    updateMacro,
    deleteMacro
};
