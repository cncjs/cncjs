import i18next from 'i18next';
import XHR from 'i18next-xhr-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import settings from 'app/config/settings';

i18next
    .use(XHR)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init(settings.i18next, (err, t) => {
        if (err) {
            return;
        }

        if (i18next.language) {
            const html = document.querySelector('html');
            html.setAttribute('lang', i18next.language);
        }
    });

export default i18next;
