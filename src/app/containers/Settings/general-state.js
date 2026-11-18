import { normalizeTheme } from 'app/lib/theme';

// The values being saved, captured when Save is pressed
export const getGeneralSubmission = (general) => ({
  allowAnonymousUsageDataCollection: !!general.allowAnonymousUsageDataCollection,
  theme: normalizeTheme(general.theme),
  lang: general.lang || 'en'
});

// Only fields this browser changed. An unchanged value may be stale and must not overwrite a newer one.
export const getGeneralChanges = (submitted, initial) => {
  const changes = {};
  if (submitted.allowAnonymousUsageDataCollection !== initial.allowAnonymousUsageDataCollection) {
    changes.allowAnonymousUsageDataCollection = submitted.allowAnonymousUsageDataCollection;
  }
  if (submitted.theme !== initial.theme) {
    changes.theme = submitted.theme;
  }
  return changes;
};

// New saved baseline: what was submitted, never what the form holds when the response arrives
export const acknowledgeGeneralSave = (initial, submitted, apiState) => ({
  ...initial,
  ...submitted,
  api: apiState
});

// Nothing may be saved before the server state was read (a failed load would write defaults)
export const canSaveGeneral = (general) => !!general.loaded && !(general.api && general.api.saving);
