import { useEffect, useState } from 'react';
import Button from '../ui/Button';
import Notice from '../ui/Notice';
import { trustState } from '../machine/trust';
import { AUTHORITY_URL, fetchAuthority } from '../machine/authority';
import { canInstall, isInstalled, promptInstall, watchInstall } from '../machine/install';
import { applyUpdate, isUpdateReady, watchUpdate } from '../machine/update';
import { t } from '../i18n';

/**
 * Putting the panel on the home screen, and what stands in the way.
 *
 * A pendant that lives in a browser tab is a pendant somebody loses behind
 * fifteen other tabs while the spindle is running. Installed it is an
 * application: its own icon, full screen, no address bar.
 *
 * The browser decides whether that is allowed and says nothing useful when it
 * is not — the menu item reads "cannot install this application" with no
 * reason given, and the actual cause is three taps away behind a struck-out
 * padlock. This screen is the panel answering the question itself.
 */

/** A fact about the certificate: what it is called, and what it says. */
const Fact = ({ label, children }) => (
  <div className="flex min-w-0 flex-col gap-0.5">
    <span className="text-cap font-semibold uppercase tracking-[0.08em] text-mut">{label}</span>
    <span className="min-w-0 break-all font-num text-note text-ink">{children}</span>
  </div>
);

const AppScreen = () => {
  /*
   * Re-read rather than held: `machine/install` owns the state, because the
   * event it depends on fires before any screen exists. This only subscribes
   * so the buttons change when it does.
   */
  const [, bump] = useState(0);
  useEffect(() => watchInstall(() => bump((n) => n + 1)), []);

  useEffect(() => watchUpdate(() => bump((n) => n + 1)), []);

  const [authority, setAuthority] = useState(null);
  useEffect(() => {
    let live = true;
    fetchAuthority().then((found) => {
      if (live) {
        setAuthority(found);
      }
    });
    return () => {
      live = false;
    };
  }, []);

  const trust = trustState({
    protocol: window.location.protocol,
    secure: window.isSecureContext,
  });

  const installed = isInstalled();
  const ready = canInstall();

  return (
    <div className="flex flex-col gap-4">
      {/*
        * The button first, because it is what this screen is for. It is dead
        * more often than it is live — everything below explains why.
        */}
      <Button
        tone="primary"
        disabled={!ready}
        onClick={promptInstall}
        className="h-ctl w-full"
      >
        {t(installed ? 'app.installed' : 'app.install')}
      </Button>

      {/*
        * Why not, when not.
        *
        * Two different problems with two different answers, and only one of
        * them is fixed by a certificate — see `machine/trust`. A browser that
        * is simply being cautious about engagement gets the third message:
        * nothing is wrong, it has not offered yet.
        */}
      {installed ? null : (
        <p className="m-0 shrink-0 text-note text-mut">
          {trust ? t(trust.key) : t(ready ? 'app.ready' : 'app.notYet')}
        </p>
      )}

      {/*
        * Reloading the panel, because the gesture that used to do it is gone.
        *
        * Pull-to-refresh is switched off across the whole panel — the same
        * drag scrolls this screen and opens the menu, and a reload triggered
        * by either would arrive in the middle of a job. That is the right
        * trade only if the panel offers the reload somewhere deliberate:
        * *"odswiezanie przez scrolowanie mozesz wylaczyc, ale dodaj do
        * ustawien aplikacji przycisk do odswiezania"* (2026-09-23).
        *
        * The line under it says what pressing it *does*, not why a gesture
        * went away: *"to do wywalenia, chyba ze piszesz ze odswieza,
        * aktualizuje aplikacje"*. Somebody reading a settings screen wants to
        * know what the button will do to them, and the history of the panel
        * is not that.
        *
        * Safe to press at any time. The port and the running job belong to
        * the server; this page re-attaches to both on the way back up.
        */}
      <div className="flex shrink-0 flex-col gap-2 border-t border-line pt-4">
        <Button
          tone={isUpdateReady() ? 'primary' : 'outline'}
          onClick={applyUpdate}
          className="h-ctl w-full"
        >
          {t('app.refresh')}
        </Button>
        <p className="m-0 text-note text-mut">
          {t(isUpdateReady() ? 'app.updateReady' : 'app.refreshWhy')}
        </p>
      </div>

      {/*
        * The certificate, shown whether or not anything is wrong with it.
        *
        * It used to appear only while the device distrusted the server, which
        * got it backwards twice over: on a panel served over plain HTTP — the
        * development case, and the first place anybody looks — it was not
        * there at all, and the moment it started working it vanished, so
        * there was no way to check *which* authority a phone had ended up
        * with. An operator asking "what did I install, and is it still the
        * right one" is asking after it worked, not before.
        */}
      {authority ? (
        <div className="flex shrink-0 flex-col gap-3 border-t border-line pt-4">
          <div className="flex flex-col gap-1">
            <h2 className="m-0 text-base font-semibold text-ink">{t('app.certTitle')}</h2>
            <p className="m-0 text-note text-mut">{t('app.certWhat')}</p>
          </div>

          {/*
            * The warning goes above the button, and it is not a formality.
            *
            * Installing a certificate authority is normally the worst thing a
            * web page can talk somebody into: it hands the device's trust to
            * whoever holds the matching key, for every site it visits.
            *
            * This one is name-constrained -- see scripts/make-certs.sh -- so
            * it can only vouch for `.lan` and private addresses. Worth saying
            * plainly rather than repeating a warning that is no longer true,
            * because a warning nobody can act on is one everybody learns to
            * tap through.
            */}
          <Notice>
            <span>{t('app.certWarning')}</span>
            <span className="text-note">{t('app.certWhere')}</span>
          </Notice>

          {/*
            * "Download", not "install". Tapping this saves a file; installing
            * it is a separate trip into the phone's own settings, and a
            * button that claims to have done that leaves somebody waiting for
            * something that already finished.
            */}
          <Button href={AUTHORITY_URL} className="h-ctl w-full">
            {t('app.certDownload')}
          </Button>

          {/*
            * The facts sit below the button rather than above it.
            *
            * They are what somebody reads to answer "which authority did I
            * end up with", which is a question asked *after* installing --
            * while the button is the task. Above, they pushed the one thing
            * this section exists for off the bottom of a 390px screen, with a
            * wall of amber in between. Lifetimes moved out of the warning for
            * the same reason: a thing that happens in a year is information,
            * not a hazard, and a warning box that is mostly prose is a
            * warning box people learn to skip.
            */}
          <Fact label={t('app.certName')}>{authority.name}</Fact>
          {authority.validTo ? (
            <Fact label={t('app.certValidTo')}>{authority.validTo.toLocaleDateString()}</Fact>
          ) : null}
          {/*
            * Long, and deliberately not shortened. Half a fingerprint
            * compared against half a fingerprint is a habit that reads as
            * checking without being it.
            */}
          <Fact label={t('app.certFingerprint')}>{authority.fingerprint}</Fact>

          <p className="m-0 text-note text-mut">{t('app.certLife')}</p>
        </div>
      ) : null}
    </div>
  );
};

export default AppScreen;
