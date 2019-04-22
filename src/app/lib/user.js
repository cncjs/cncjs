import api from 'app/api';
import config from 'app/store';

let _authenticated = false;

export const signin = ({ token, name, password }) => new Promise((resolve, reject) => {
    api.signin({ token, name, password })
        .then((res) => {
            const { enabled = false, token = '', name = '' } = { ...res.body };

            config.set('session.enabled', enabled);
            config.set('session.token', token);
            config.set('session.name', name);

            // Persist data after successful login to prevent debounced update
            config.persist();

            _authenticated = true;
            resolve({ authenticated: true, token: token });
        })
        .catch((res) => {
            // Do not unset session token so it won't trigger an update to the store
            _authenticated = false;
            resolve({ authenticated: false, token: null });
        });
});

export const signout = () => new Promise((resolve, reject) => {
    config.unset('session.token');
    _authenticated = false;
    resolve();
});

export const isAuthenticated = () => {
    return _authenticated;
};
