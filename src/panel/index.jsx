import { createRoot } from 'react-dom/client';
import App from './App';
import { syncThemeColor } from './ui/themeColor';
import { startTheme } from './ui/theme';
import './styles/base.css';
// The manifest and the icons. Nothing in the panel's code reads them — the
// operating system does, by URL — so without this import webpack has no
// reason to emit them and the phone gets a 404. See `assets.js`.
import './assets';

/*
 * The theme before the first render, not after it.
 *
 * `startTheme` writes `data-theme` on the root from what was remembered, or
 * from the phone when nothing was. Everything downstream reads that attribute
 * — every token, the 3D scene, and the status bar below — so doing it after
 * `render` would paint one frame in the wrong theme and then correct it.
 * See `ui/theme`.
 */
startTheme();

createRoot(document.getElementById('panel-root')).render(<App />);

/*
 * The service worker, so that a panel with no server still opens.
 *
 * Installed on a phone the pendant is an application, and tapping it while
 * the garage PC is off gave the browser's offline page inside the app frame:
 * no panel, no state chip, nothing to read. The panel already knows how to
 * say "the server is not answering" — it never got the chance to load and
 * say it.
 *
 * Registered in development as well as production, deliberately. A worker
 * that only exists in a production build is a worker nobody ever runs until
 * it misbehaves in the garage; this one is network-first, so with a server up
 * it behaves exactly as if it were not there. See `sw.js`.
 *
 * Failure is swallowed on purpose. Service workers need a secure context, so
 * over plain HTTP this throws on every origin but `localhost` — and the panel
 * reached at `http://cnc.lan:8000` from a phone is precisely that case. It is
 * a panel without an offline shell, which is what it was before, rather than
 * a panel with an error in its console.
 */
/*
 * The status bar takes the panel's colour, and keeps taking it.
 *
 * The page head carries one `theme-color` tag with a light value, for the
 * instant before this runs; from here on its content follows `--panel`
 * through every theme change and dims with the panel when a sheet covers it.
 * See `ui/themeColor`.
 */
syncThemeColor();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/panel/sw.js', { scope: '/panel/' })
      .catch(() => undefined);
  });
}
