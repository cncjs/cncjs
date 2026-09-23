import { t } from '../i18n';

/**
 * A triangle, for the one thing on a screen that wants reading before it is
 * acted on.
 *
 * Its own component because it is now in three places — the status sheet, and
 * the two notices below — and a warning drawn slightly differently in each is
 * a warning that stops reading as one thing.
 */
export const Triangle = ({ className = 'size-4' }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={`${className} shrink-0`}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 4.5 1.8 20h20.4z" />
    <path d="M12 10v4.5" />
    <path d="M12 17.4v.2" />
  </svg>
);

/**
 * Something the operator should read before doing the thing next to it.
 *
 * Amber and marked, because the panel spends red on a machine that will not
 * move and has nothing left for "this is a decision". The triangle is what
 * makes it a warning rather than a paragraph — the same mark the status sheet
 * uses when there is something to act on.
 *
 * `role="note"` rather than `alert`: nothing here interrupts, and an assertive
 * live region that announced itself every time a settings tab was opened
 * would be the panel shouting at somebody who came to read.
 */
const Notice = ({ children, className = '' }) => (
  <div
    role="note"
    aria-label={t('notice.warning')}
    className={`flex shrink-0 items-start gap-3 rounded-ctl border border-amb bg-ambS px-4 py-3 ${className}`}
  >
    <span className="pt-0.5 text-amb">
      <Triangle className="size-5" />
    </span>
    <div className="flex min-w-0 flex-col gap-2 text-base text-amb">{children}</div>
  </div>
);

export default Notice;
