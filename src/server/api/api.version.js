import url from 'url';
import registryUrl from 'registry-url';
import registryAuthToken from 'registry-auth-token';
import {
  ERR_INTERNAL_SERVER_ERROR
} from '../constants';

const pkgName = 'cncjs';

export const getLatestVersion = async (req, res) => {
  const scope = pkgName.split('/')[0];
  const regUrl = registryUrl(scope);
  const pkgUrl = url.resolve(regUrl, encodeURIComponent(pkgName).replace(/^%40/, '@'));
  const authInfo = registryAuthToken(regUrl);
  const headers = {};

  if (authInfo) {
    headers.Authorization = `${authInfo.type} ${authInfo.token}`;
  }

  let data;

  try {
    const response = await fetch(pkgUrl, { headers });

    if (!response.ok) {
      res.status(ERR_INTERNAL_SERVER_ERROR).send({
        msg: `Failed to connect to ${pkgUrl}: code=${response.status}`
      });
      return;
    }

    data = await response.json();
  } catch (err) {
    // fetch reports a transport failure as a TypeError and hangs the real
    // reason off `cause`, so the errno lives one level down rather than on
    // the error itself the way superagent surfaced it.
    const code = (err && err.cause && err.cause.code) || (err && err.code);

    res.status(ERR_INTERNAL_SERVER_ERROR).send({
      msg: `Failed to connect to ${pkgUrl}: code=${code}`
    });
    return;
  }

  data = { ...data };
  data.time = data.time || {};
  data['dist-tags'] = data['dist-tags'] || {};
  data.versions = data.versions || {};

  const latest = data['dist-tags'].latest;
  const time = data.time[latest];
  const {
    name,
    version,
    description,
    homepage
  } = { ...data.versions[latest] };

  res.send({ time, name, version, description, homepage });
};
