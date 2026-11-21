/* eslint-env jest */
import isEqual from 'lodash/isEqual';
import {
  acknowledgeGeneralSave,
  canSaveGeneral,
  getGeneralChanges,
  getGeneralSubmission
} from '../general-state';

const api = { err: false, loading: false, saving: false };
const loaded = (over = {}) => ({
  loaded: true,
  api,
  allowAnonymousUsageDataCollection: false,
  colorMode: 'dark',
  lang: 'en',
  ...over
});

// Mirrors api.state.set on the server: only the keys present in the request are written
const serverSet = (server, data) => Object.assign(server, data);

describe('getGeneralSubmission', () => {
  test('an invalid colorMode is submitted as light', () => {
    expect(getGeneralSubmission(loaded({ colorMode: 'bogus' })).colorMode).toBe('light');
  });

  test('defaults the language and coerces the checkbox to a boolean', () => {
    const submitted = getGeneralSubmission(loaded({ lang: undefined, allowAnonymousUsageDataCollection: 1 }));
    expect(submitted.lang).toBe('en');
    expect(submitted.allowAnonymousUsageDataCollection).toBe(true);
  });
});

describe('getGeneralChanges', () => {
  test('sends nothing when nothing changed', () => {
    expect(getGeneralChanges(getGeneralSubmission(loaded()), loaded())).toEqual({});
  });

  test('sends only the colorMode when only the colorMode changed', () => {
    const submitted = getGeneralSubmission(loaded({ colorMode: 'light' }));
    expect(getGeneralChanges(submitted, loaded())).toEqual({ colorMode: 'light' });
  });

  test('sends only data collection when only that changed', () => {
    const submitted = getGeneralSubmission(loaded({ allowAnonymousUsageDataCollection: true }));
    expect(getGeneralChanges(submitted, loaded())).toEqual({ allowAnonymousUsageDataCollection: true });
  });

  test('a language-only change sends nothing to the server', () => {
    const submitted = getGeneralSubmission(loaded({ lang: 'de' }));
    expect(getGeneralChanges(submitted, loaded())).toEqual({});
  });
});

describe('two browsers with the same loaded theme', () => {
  test('an unrelated save in a stale browser does not restore its old theme', () => {
    const server = { colorMode: 'dark', allowAnonymousUsageDataCollection: false };

    // Both browsers load colorMode=dark
    const initialA = loaded({ colorMode: 'dark' });
    const initialB = loaded({ colorMode: 'dark' });

    // Browser A switches to Light and saves
    const submittedA = getGeneralSubmission(loaded({ colorMode: 'light' }));
    serverSet(server, getGeneralChanges(submittedA, initialA));
    expect(server.colorMode).toBe('light');

    // Browser B (still holding the old Dark) only changes data collection and saves
    const submittedB = getGeneralSubmission(loaded({ colorMode: 'dark', allowAnonymousUsageDataCollection: true }));
    serverSet(server, getGeneralChanges(submittedB, initialB));

    expect(server.allowAnonymousUsageDataCollection).toBe(true);
    expect(server.colorMode).toBe('light'); // not overwritten by B's stale value
  });

  test('a browser that changed the colorMode still wins for the theme', () => {
    const server = { colorMode: 'light' };
    const initialB = loaded({ colorMode: 'light' });
    const submittedB = getGeneralSubmission(loaded({ colorMode: 'dark' }));
    serverSet(server, getGeneralChanges(submittedB, initialB));
    expect(server.colorMode).toBe('dark'); // last write wins when the user actually changed it
  });
});

describe('acknowledgeGeneralSave', () => {
  test('an edit made while a save is pending stays unsaved', () => {
    const initial = loaded({ colorMode: 'dark' });
    const submitted = getGeneralSubmission(loaded({ colorMode: 'light' })); // Save pressed with Light
    const formWhenResponseArrives = loaded({ colorMode: 'dark' }); // user switched back meanwhile
    const baseline = acknowledgeGeneralSave(initial, submitted, api);

    expect(baseline.colorMode).toBe('light'); // what was applied and persisted
    expect(isEqual(baseline, formWhenResponseArrives)).toBe(false); // so Save stays enabled
  });

  test('without later edits the form equals the baseline (Save disabled)', () => {
    const submitted = getGeneralSubmission(loaded({ colorMode: 'light' }));
    const baseline = acknowledgeGeneralSave(loaded(), submitted, api);
    expect(isEqual(baseline, loaded({ colorMode: 'light' }))).toBe(true);
  });

  test('keeps fields the save did not touch', () => {
    const initial = loaded({ lang: 'fr' });
    const submitted = { ...getGeneralSubmission(loaded()), lang: 'fr' };
    expect(acknowledgeGeneralSave(initial, submitted, api).loaded).toBe(true);
  });
});

describe('canSaveGeneral', () => {
  test('is false before the server state was loaded (failed or pending load)', () => {
    expect(canSaveGeneral(loaded({ loaded: false }))).toBe(false);
  });

  test('is false while a save is running', () => {
    expect(canSaveGeneral(loaded({ api: { ...api, saving: true } }))).toBe(false);
  });

  test('is true once loaded and idle', () => {
    expect(canSaveGeneral(loaded())).toBe(true);
  });
});
