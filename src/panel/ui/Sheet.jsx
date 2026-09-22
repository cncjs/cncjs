import { useEffect } from 'react';
import { t } from '../i18n';

/**
 * A panel that slides up over the screen, for a decision taken and finished.
 *
 * On a phone the alternative was folding the settings open in place, and that
 * moves the jog keys — the pad shrinks to make room and springs back when it
 * closes, so the keys are somewhere else each time. They are hit by a thumb
 * while the eyes are on the cutter, which is the whole reason they must not
 * move. Scrolling has the same fault by another route.
 *
 * A sheet moves nothing. It covers, it is answered, it goes, and everything is
 * exactly where it was left.
 *
 * `fixed` positions against the panel's own root when that root is transformed,
 * which is what the review frame does, and against the viewport when it is
 * not. Both are the right answer for where this should sit.
 */
const Sheet = ({ title, onClose, children }) => {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      {/* Dismiss by tapping away from it — the usual gesture, and it means the
        * sheet can be got rid of without aiming at anything. */}
      <button
        type="button"
        aria-label={t('sheet.close')}
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default bg-scrim"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-gap rounded-t-card border-t border-line bg-panel p-pad"
      >
        <div className="flex items-center gap-3">
          <span className="text-cap font-semibold uppercase tracking-[0.08em] text-ink">{title}</span>
          <span className="h-px flex-1 bg-line" />
          <button
            type="button"
            onClick={onClose}
            className="h-chiph rounded-ctl border border-line bg-surf px-4 text-base font-semibold uppercase tracking-[0.1em] text-ink"
          >
            {t('sheet.done')}
          </button>
        </div>
        {children}
      </div>
    </>
  );
};

export default Sheet;
