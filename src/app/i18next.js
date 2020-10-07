import i18next from 'i18next';
import XHR from 'i18next-xhr-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

i18next
  .use(XHR)
  .use(LanguageDetector)
  .use(initReactI18next);

export default i18next;
