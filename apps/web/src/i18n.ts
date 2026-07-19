import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

const ALL_LOCALES = ['en','fr','es','de','ja','ko','zh','hi','ar','pt','ru','it','nl','pl','tr','th','vi','id'];

export default getRequestConfig(async () => {
  let locale = 'en';

  // 1. Check NEXT_LOCALE cookie (set by proxy on locale-prefixed URLs)
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE');
  if (localeCookie?.value && ALL_LOCALES.includes(localeCookie.value)) {
    locale = localeCookie.value;
  }

  // 2. Fallback to Accept-Language header
  if (locale === 'en') {
    const headersList = await headers();
    const acceptLang = headersList.get('accept-language');
    if (acceptLang) {
      const m = acceptLang.match(/^[a-z]{2}(-[A-Z]{2})?/i);
      if (m) {
        const base = m[0].split('-')[0];
        if (ALL_LOCALES.includes(base)) locale = base;
      }
    }
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
