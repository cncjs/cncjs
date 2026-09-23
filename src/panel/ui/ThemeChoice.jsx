import { useEffect, useState } from 'react';
import SegmentedChoice from './SegmentedChoice';
import { THEMES, readPreference, setPreference, watchTheme } from './theme';
import { t } from '../i18n';

/**
 * Light, dark, or whatever the phone is doing.
 *
 * Three chips rather than a switch, because the third is not a middle
 * position between the other two -- it is a different kind of answer, and a
 * two-state control cannot offer it. Every option on screen at once is the
 * same rule the jog step and the coordinate system follow.
 *
 * The setting is read back from `ui/theme` rather than held here: the system
 * can change it underneath this screen while it is open, and the panel is
 * also flipped from outside React by the review overlay.
 */

/*
 * Each key written out, not assembled from the value.
 *
 * `t(`theme.${id}`)` would be shorter and would be a key nothing can grep
 * for — the resources test looks for quoted dotted literals, so three real
 * keys would read as three nobody asks for and a misspelling would reach an
 * operator. Same reason the rail and the settings tabs write theirs out.
 */
const LABELS = {
  system: 'theme.system',
  light: 'theme.light',
  dark: 'theme.dark',
};

const ThemeChoice = () => {
  const [choice, setChoice] = useState(readPreference);

  useEffect(() => watchTheme(setChoice), []);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-cap font-semibold uppercase tracking-[0.08em] text-mut">
        {t('theme.label')}
      </span>
      <SegmentedChoice
        label={t('theme.label')}
        options={THEMES}
        value={choice}
        onChange={setPreference}
        format={(id) => t(LABELS[id])}
      />
    </div>
  );
};

export default ThemeChoice;
