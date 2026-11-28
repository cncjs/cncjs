/* eslint-env jest */
import fs from 'fs';
import path from 'path';
import http from 'http';
import { createPublicViewRouter } from '../routes/view';
import serviceContainer from '../service-container';
import { readConnectionRecoveryConfig } from '../../app/lib/server-watch';

jest.mock('../service-container', () => {
  const store = { get: jest.fn() };
  return { resolve: () => store };
});

const express = require('express');
const consolidate = require('consolidate');

const userStore = serviceContainer.resolve('userStore');

test.each([
  [undefined, false],
  [null, false],
  [false, false],
  ['true', false],
  [1, false],
  [true, true],
])('renders offlineFallback=%j through HTTP and the template into the client', async (value, expected) => {
  userStore.get.mockReturnValue(value);
  const app = express();
  app.engine('html', consolidate.hogan);
  app.set('view engine', 'html');
  app.set('views', path.resolve(__dirname, '../../app'));
  app.use((req, res, next) => {
    req.language = 'en';
    req.t = key => key;
    next();
  });
  app.use(createPublicViewRouter());
  // Render the actual source template while retaining Express' response path.
  app.set('view', class View {
    constructor() {
      this.path = path.resolve(__dirname, '../../app/index.tmpl.html');
    }

    render(locals, callback) {
      const Hogan = require('hogan.js');
      callback(null, Hogan.compile(fs.readFileSync(this.path, 'utf8')).render(locals));
    }
  });
  const server = http.createServer(app);
  try {
    await new Promise(resolve => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const response = await fetch(`http://127.0.0.1:${server.address().port}/`);
    expect(response.status).toBe(200);
    const html = await response.text();
    const textContent = html.match(/<script id="cncjs-config" type="application\/json">([\s\S]*?)<\/script>/)[1];
    expect(JSON.parse(textContent)).toEqual({ connectionRecovery: { offlineFallback: expected } });
    expect(readConnectionRecoveryConfig({ getElementById: () => ({ textContent }) }))
      .toEqual({ offlineFallback: expected });
  } finally {
    await new Promise(resolve => {
      server.close(resolve);
    });
  }
});
