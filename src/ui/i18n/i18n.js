import LocalizedStrings from "react-localization";
import { ar } from "./resource/ar.js";
import { en } from "./resource/en.js";
import { es } from "./resource/es.js";
import { hi } from "./resource/hi.js";
import { zh } from "./resource/zh.js";

const userLanguageKey = "user_current_language";

export default class i18n {
  static translations;

  static init() {
    this.translations = new LocalizedStrings({
      en: en,
      ar: ar,
      es: es,
      hi: hi,
      zh: zh,
    });
    const language = localStorage.getItem(userLanguageKey);
    if (language) {
      this.translations.setLanguage(language);
    }
  }

  static SetLanguage(language) {
    localStorage.setItem(userLanguageKey, language);
    this.translations.setLanguage(language);
  }

  static GetLanguage() {
    return this.translations.getLanguage();
  }

  static T(key) {
    return this.translations.getString(key);
  }

  static F(key, ...values) {
    return this.translations.formatString(this.translations.getString(key), ...values);
  }
}
