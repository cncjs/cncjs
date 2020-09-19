import express from 'express';
import _get from 'lodash/get';
import settings from '../config/settings';

const createPublicViewRouter = () => {
  const router = express.Router();
  const view = 'index.html';

  router.get('/', (req, res) => {
    // Override IE's Compatibility View Settings
    // http://stackoverflow.com/questions/6156639/x-ua-compatible-is-set-to-ie-edge-but-it-still-doesnt-stop-compatibility-mode
    res.set({ 'X-UA-Compatible': 'IE=edge' });

    const webroot = _get(settings, 'assets.app.routes[0]', ''); // with trailing slash
    const { language, t } = req;
    const locals = {
      webroot,
      lang: language,
      title: `${t('title')} ${settings.version}`,
      loading: t('loading'),
    };

    res.render(view, locals);
  });

  return router;
};

export { createPublicViewRouter };
