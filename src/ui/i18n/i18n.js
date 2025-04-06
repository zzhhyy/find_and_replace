import LocalizedStrings from "react-localization";
import { ar } from "./resource/ar.js";
import { de } from "./resource/de.js";
import { en } from "./resource/en.js";
import { es } from "./resource/es.js";
import { fr } from "./resource/fr.js";
import { hi } from "./resource/hi.js";
import { id } from "./resource/id.js";
import { it } from "./resource/it.js";
import { ja } from "./resource/ja.js";
import { ko } from "./resource/ko.js";
import { pt } from "./resource/pt.js";
import { ru } from "./resource/ru.js";
import { vi } from "./resource/vi.js";
import { zh } from "./resource/zh.js";

const userLanguageKey = "user_current_language";

export default class i18n {
  static translations;

  static init() {
    this.translations = new LocalizedStrings({
      en: en,
      ar: ar,
      de: de,
      es: es,
      fr: fr,
      hi: hi,
      id: id,
      it: it,
      ja: ja,
      ko: ko,
      pt: pt,
      ru: ru,
      vi: vi,
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
