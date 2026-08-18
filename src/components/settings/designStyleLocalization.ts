import type { Locale } from '../../i18n/locale';

// English-only: localization functions return the input unchanged.
export function localizeDesignPresetName(name: string, _locale: Locale): string {
  return name;
}
export function localizeDesignRole(role: string, _locale: Locale): string {
  return role;
}

export function localizeDesignFontRole(role: string, _locale: Locale): string {
  return role;
}

export function localizeDesignStyleGuide(guide: string, _locale: Locale): string {
  return guide;
}
