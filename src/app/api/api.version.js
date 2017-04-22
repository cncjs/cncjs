import url from 'url';
import registryUrl from 'registry-url';
import registryAuthToken from 'registry-auth-token';
import request from 'superagent';
import pkg from '../../package.json';
import {
    ERR_INTERNAL_SERVER_ERROR
} from '../constants';

export const getLatestVersion = (req, res) => {
    const scope = pkg.name.split('/')[0];
    const regUrl = registryUrl(scope);
    const pkgUrl = url.resolve(regUrl, encodeURIComponent(pkg.name).replace(/^%40/, '@'));
    const authInfo = registryAuthToken(regUrl);
    const headers = {};

    if (authInfo) {
        headers.Authorization = `${authInfo.type} ${authInfo.token}`;
    }

    request
        .get(pkgUrl)
        .set(headers)
        .end((err, _res) => {
            if (err) {
                res.status(ERR_INTERNAL_SERVER_ERROR).send({
                    msg: `Failed to connect to ${pkgUrl}: code=${err.code}`
                });
                return;
            }

            const { body: data = {} } = { ..._res };
            data.time = data.time || {};
            data['dist-tags'] = data['dist-tags'] || {};
            data.versions = data.versions || {};

            const time = data.time[latest];
            const latest = data['dist-tags'].latest;
            const {
                name,
                version,
                description,
                homepage
            } = { ...data.versions[latest] };

            res.send({ time, name, version, description, homepage });
        });
};
