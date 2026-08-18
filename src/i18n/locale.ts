// English-only i18n: t() looks up the EN dictionary by Chinese key (legacy),
// falling back to the key itself. The locale is always 'en'.
// Rules: Use useT() (subscription rerendering) in React components; pure helper
// modules can directly import { t }.
// LLM interface (systemPrompt/tool description/skill content) and persistent
// dynamic history tags do not enter i18n.
import { useSyncExternalStore } from 'react';
import { EN } from './dict/en';
import EN_DATA from './dict/en/templates-data';

export type Locale = 'en';

const current: Locale = 'en';
const subscribers = new Set<() => void>();

export function getLocale(): Locale {
  return current;
}

export function setLocale(_next: Locale): void {
  // No-op: English only.
  subscribers.forEach((notify) => notify());
}

/** t('Selected {n}', { n: 3 }) - The original Chinese text is the key; the placeholder {name} has the same name in both languages. */
export function t(zh: string, params?: Record<string, string | number>): string {
  const raw = EN[zh] ?? zh;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match));
}

/** Data localization: display names (template names, etc.) via the EN dictionary. If not found, returned as-is. */
export function tData(text: string): string {
  return EN_DATA[text] ?? text;
}

/** Get t in the component: subscribe to language switching, trigger rerendering of this component when switching. */
export function useT(): typeof t {
  useSyncExternalStore(
    (onChange) => {
      subscribers.add(onChange);
      return () => subscribers.delete(onChange);
    },
    () => current,
  );
  return t;
}
