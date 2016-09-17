import set from 'lodash/set';
import request from 'superagent';

const API = {};

{ // getLatestVersion
    const fn = () => new Promise((resolve, reject) => {
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
    set(API, 'getLatestVersion', fn);
}

{ // listControllers
    const fn = () => new Promise((resolve, reject) => {
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
    set(API, 'listControllers', fn);
}

{ // loadGCode
    const fn = (options) => new Promise((resolve, reject) => {
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
    set(API, 'loadGCode', fn);
}

{ // fetchGCode
    const fn = (options) => new Promise((resolve, reject) => {
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
    set(API, 'fetchGCode', fn);
}

{ // listMacros
    const fn = () => new Promise((resolve, reject) => {
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
    set(API, 'listMacros', fn);
}

{ // getMacro
    const fn = (options) => new Promise((resolve, reject) => {
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
    set(API, 'getMacro', fn);
}

{ // addMacro
    const fn = (options) => new Promise((resolve, reject) => {
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
    set(API, 'addMacro', fn);
}

{ // updateMacro
    const fn = (options) => new Promise((resolve, reject) => {
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
    set(API, 'updateMacro', fn);
}

{ // deleteMacro
    const fn = (options) => new Promise((resolve, reject) => {
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
    set(API, 'deleteMacro', fn);
}

export default API;
