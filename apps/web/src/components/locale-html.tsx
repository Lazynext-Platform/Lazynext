"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

const LOCALES = ["en","fr","es","de","ja","ko","zh","hi","ar","pt","ru","it","nl","pl","tr","th","vi","id"];

function getLocaleFromPath(pathname: string): string {
  const m = pathname.match(/^\/([a-z]{2})(\/|$)/);
  if (m && LOCALES.includes(m[1])) return m[1];
  return "en";
}

export function LocaleHtml({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} suppressHydrationWarning>
      {children}
    </html>
  );
}
