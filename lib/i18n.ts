import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Load resources (for now only Czech)
import cs from '../locales/cs.json';

// You can extend here with more languages if needed
const resources = {
  cs: { translation: cs },
};

if (!i18n.isInitialized) {
  // Safely get locale, default to 'cs' if unavailable
  const locale = Localization.locale || 'cs';
  const detectedLang = locale.startsWith('cs') ? 'cs' : 'cs'; // default to Czech for this app
  
  i18n
    .use(initReactI18next)
    .init({
      compatibilityJSON: 'v3',
      resources,
      lng: detectedLang,
      fallbackLng: 'cs',
      interpolation: {
        escapeValue: false,
      },
    })
    .catch(() => {
      // no-op
    });
}

export default i18n;


