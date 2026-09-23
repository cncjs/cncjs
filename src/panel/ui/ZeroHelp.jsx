import Sheet from './Sheet';
import { t } from '../i18n';

/**
 * What zeroing is, for somebody who wants to know.
 *
 * All of this used to be on the screen itself -- a grey paragraph explaining
 * what a work offset is, and an amber one arguing why the panel refuses to
 * guess a coordinate system. Mateusz, 2026-09-23: read as somebody who knows
 * CNC, both made him *"czul bym sie jak debil"*, and read as a hobbyist the
 * thing he actually wanted was the `?`.
 *
 * So the screen states what is true now and the explanation lives here. That
 * is the same move the alarm paragraph made a day earlier, off this very
 * screen and into the state help.
 */
const ZeroHelp = ({ onClose }) => (
  <Sheet title={t('zero.help.title')} onClose={onClose}>
    <p className="m-0 text-base text-ink">{t('zero.help.what')}</p>
    <p className="m-0 text-base text-ink">{t('zero.help.moves')}</p>
    <p className="m-0 text-base text-ink">{t('zero.help.system')}</p>
    <p className="m-0 text-base text-ink">{t('zero.help.dead')}</p>
  </Sheet>
);

export default ZeroHelp;
