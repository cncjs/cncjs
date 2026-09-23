/**
 * The files the operating system asks for, brought into the build.
 *
 * Imported for their side effect. Webpack emits an `asset/resource` only when
 * something in the graph references it, and nothing in the panel's code ever
 * *reads* its own icon — the manifest and `index.html` name them by URL, from
 * outside JavaScript entirely. Without this module they would simply not be
 * built, and the failure would be a 404 on a phone rather than anything a
 * test or a compile could see.
 *
 * One import per file rather than `require.context`, so that "which icons
 * does the panel ship" is a question `grep` can answer.
 */
import './manifest.webmanifest';

import './icons/favicon.svg';
import './icons/icon-192.png';
import './icons/icon-512.png';
import './icons/icon-maskable-512.png';
import './icons/apple-touch-icon.png';
