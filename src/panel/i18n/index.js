import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './en/panel.json';
import pl from './pl/panel.json';

/**
 * The panel's own translations, separate from the old application's.
 *
 * `src/app` keys its resources by the sha1 of the English source text and has
 * `i18next-scanner` regenerate them on every build. That model is why nobody
 * can read a diff of `resource.json`, and it needs i18next running before any
 * module that names a string — which the panel's Jest tier, with no DOM and
 * only `.js` transformed, does not have. Here the keys are written by hand and
 * mean something, the resources are edited by hand, and no build step rewrites
 * them.
 *
 * Being its own module is also what keeps rule 6 intact: the panel still takes
 * exactly one thing from `src/app`, and that is the controller client.
 *
 * English is the source language and the fallback; Polish is a translation of
 * it. A missing Polish key therefore shows English rather than a key name.
 */
i18next
  .use(LanguageDetector)
  .init({
    fallbackLng: 'en',
    // 'pl-PL' from a browser has to find the 'pl' resources.
    load: 'languageOnly',
    supportedLngs: ['en', 'pl'],
    resources: {
      en: { panel: en },
      pl: { panel: pl },
    },
    ns: ['panel'],
    defaultNS: 'panel',
    detection: {
      // The querystring first so `/panel/?lng=en` can be pointed at a
      // language without touching the browser's own setting — which is how
      // the end-to-end tier checks that this is a translation and not a file
      // of constants. No caches: a language picked once for a test would
      // otherwise persist into the next session in localStorage, and the
      // panel would be answering a question nobody asked again.
      order: ['querystring', 'navigator'],
      caches: [],
    },
    interpolation: {
      // React escapes what it renders; doing it twice turns `−` into `&#45;`.
      escapeValue: false,
    },
    // i18next 25 prints an advertisement for its authors' hosted product to
    // the console on every init. The console of a machine controller is where
    // somebody looks when a job has gone wrong.
    showSupportNotice: false,
  });

/**
 * Every displayed string in the panel comes through here.
 *
 * A thin wrapper rather than `i18next.t` directly, so that the import in every
 * component names the panel's i18n rather than the library, and so the JSX
 * reads `t('jog.home')` instead of a call through a default export.
 */
export const t = (key, options) => i18next.t(key, options);

export default i18next;
