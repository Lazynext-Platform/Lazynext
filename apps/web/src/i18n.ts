import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

const ALL_LOCALES = ['en','fr','es','de','ja','ko','zh','hi','ar','pt','ru','it','nl','pl','tr','th','vi','id'];

export default getRequestConfig(async () => {
  let locale = 'en';

  // 1. Check cookie (set by proxy on previous requests)
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE');
  if (localeCookie?.value && ALL_LOCALES.includes(localeCookie.value)) {
    locale = localeCookie.value;
  }

  // 2. Check URL pathname from the x-next-pathname header (set by proxy rewrite)
  const headersList = await headers();
  const pathname = headersList.get('x-next-pathname') || headersList.get('x-invoke-path') || '';
  const urlMatch = pathname.match(/^\/([a-z]{2})(\/|$)/);
  if (urlMatch && ALL_LOCALES.includes(urlMatch[1])) {
    locale = urlMatch[1];
  }

  // 3. Check referer for locale prefix
  if (locale === 'en') {
    const referer = headersList.get('referer') || '';
    const refMatch = referer.match(/\/\/(?:[^/]+)\/([a-z]{2})(\/|$)/);
    if (refMatch && ALL_LOCALES.includes(refMatch[1])) {
      locale = refMatch[1];
    }
  }

  // 4. Fallback to Accept-Language
  if (locale === 'en') {
    const acceptLanguage = headersList.get('accept-language');
    if (acceptLanguage) {
      const match = acceptLanguage.match(/^[a-z]{2}(-[A-Z]{2})?/i);
      if (match) {
        const base = match[0].split('-')[0];
        if (ALL_LOCALES.includes(base)) locale = base;
      }
    }
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
