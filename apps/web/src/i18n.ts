import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

const ALL_LOCALES = ['en','fr','es','de','ja','ko','zh','hi','ar','pt','ru','it','nl','pl','tr','th','vi','id'];

export default getRequestConfig(async () => {
  let locale = 'en';
  
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE');
  
  if (localeCookie?.value) {
    locale = localeCookie.value;
  } else {
    const headersList = await headers();
    const acceptLanguage = headersList.get('accept-language');
    if (acceptLanguage) {
      const match = acceptLanguage.match(/^[a-z]{2}(-[A-Z]{2})?/i);
      if (match) {
        const base = match[0].split('-')[0];
        if (ALL_LOCALES.includes(base)) locale = base;
      }
    }
  }

  if (!ALL_LOCALES.includes(locale)) locale = 'en';

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
