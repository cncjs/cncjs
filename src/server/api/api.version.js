import url from 'url';
import registryUrl from 'registry-url';
import registryAuthToken from 'registry-auth-token';
import request from 'superagent';
import {
  ERR_INTERNAL_SERVER_ERROR
} from '../constants';

const pkgName = 'cncjs';

export const getLatestVersion = (req, res) => {
  const scope = pkgName.split('/')[0];
  const regUrl = registryUrl(scope);
  const pkgUrl = url.resolve(regUrl, encodeURIComponent(pkgName).replace(/^%40/, '@'));
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

      // Spread the body, not the response: as of superagent 10 `body` is
      // reached through the prototype, so `{ ..._res }` drops it and every
      // field below silently resolves to undefined.
      const data = { ...(_res && _res.body) };
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
