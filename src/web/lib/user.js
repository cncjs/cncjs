import api from '../api';
import store from '../store';

let authenticated = false;

module.exports = {
    signin: ({ token, name, password }) => new Promise((resolve, reject) => {
        api.signin({ token, name, password })
            .then((res) => {
                const { enabled = false, token = '', name = '' } = { ...res.body };
                store.set('session.enabled', enabled);
                store.set('session.token', token);
                store.set('session.name', name);

                authenticated = true;
                resolve({ authenticated: true, token: token });
            })
            .catch((res) => {
                // Keep session.name if a login failure occurred
                store.unset('session.token');
                authenticated = false;
                resolve({ authenticated: false, token: null });
            });
    }),
    signout: () => new Promise((resolve, reject) => {
        store.unset('session.token');
        authenticated = false;
        resolve();
    }),
    authenticated: () => {
        return authenticated;
    }
};
