/* eslint-env jest */
import { reloadPage } from '../reload-page';

describe('reloadPage', () => {
  const originalWindow = global.window;
  const originalNavigator = global.navigator;
  let reload;

  const setNavigator = (value) => {
    Object.defineProperty(global, 'navigator', { value, configurable: true });
  };

  beforeEach(() => {
    reload = jest.fn();
    Object.defineProperty(global, 'window', { value: { location: { reload } }, configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(global, 'window', { value: originalWindow, configurable: true });
    setNavigator(originalNavigator);
  });

  it('does a normal reload when a service worker controls the page', () => {
    setNavigator({ serviceWorker: { controller: {} } });
    reloadPage();
    expect(reload.mock.calls[0][0]).toBe(false);
  });

  it('keeps the forced reload when no service worker controls the page', () => {
    setNavigator({ serviceWorker: { controller: null } });
    reloadPage();
    expect(reload.mock.calls[0][0]).toBe(true);
  });

  it('keeps the forced reload when service workers are unsupported', () => {
    setNavigator({});
    reloadPage();
    expect(reload.mock.calls[0][0]).toBe(true);
  });
});
