import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export default getRequestConfig(async () => {
  // Try to get locale from cookie, then accept-language header, default to en
  let locale = 'en';
  
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE');
  
  if (localeCookie?.value) {
    locale = localeCookie.value;
  } else {
    const headersList = await headers();
    const acceptLanguage = headersList.get('accept-language');
    if (acceptLanguage) {
      // Basic extraction of the primary locale
      const match = acceptLanguage.match(/^[a-z]{2}(-[A-Z]{2})?/i);
      if (match) {
        locale = match[0].split('-')[0]; // Extract just 'en', 'fr', etc for now
      }
    }
  }

  // Ensure fallback if locale isn't supported yet
  if (!['en', 'fr', 'es'].includes(locale)) {
    locale = 'en';
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
