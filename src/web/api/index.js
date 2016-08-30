import set from 'lodash/set';
import request from 'superagent';

const API = {};

{ // getAllMacros
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
    set(API, 'getAllMacros', fn);
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

{ // removeMacro
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
    set(API, 'removeMacro', fn);
}

export default API;
