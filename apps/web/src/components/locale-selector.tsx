"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";

const SUPPORTED_LOCALES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "th", name: "ไทย", flag: "🇹🇭" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩" },
];

export function LocaleSelector() {
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const currentLocale = SUPPORTED_LOCALES.find((l) => l.code === locale) || SUPPORTED_LOCALES[0];

  const handleSelect = (code: string) => {
    setOpen(false);
    // Set cookie and redirect
    document.cookie = `NEXT_LOCALE=${code};path=/;max-age=31536000`;
    const pathParts = window.location.pathname.split("/");
    pathParts[1] = code;
    router.push(pathParts.join("/"));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground/5 hover:bg-foreground/10 transition-colors text-sm font-medium"
        aria-label="Switch language"
      >
        <Globe className="w-4 h-4" />
        <span>{currentLocale.flag}</span>
        <span className="hidden sm:inline">{currentLocale.name}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-background border border-foreground/10 rounded-xl shadow-xl z-50 max-h-72 overflow-y-auto py-1">
            {SUPPORTED_LOCALES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-foreground/5 transition-colors ${
                  lang.code === locale ? "bg-foreground/10 font-semibold" : ""
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Currency selector component — standalone dropdown for choosing preferred currency.
 */
const COMMON_CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "CHF", name: "Swiss Franc", symbol: "Fr." },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "MXN", name: "Mexican Peso", symbol: "Mex$" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
  { code: "DKK", name: "Danish Krone", symbol: "kr." },
  { code: "PLN", name: "Polish Zloty", symbol: "zł" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱" },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "SAR", name: "Saudi Riyal", symbol: "ر.س" },
  { code: "QAR", name: "Qatari Rial", symbol: "ر.ق" },
  { code: "EGP", name: "Egyptian Pound", symbol: "ج.م" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
  { code: "ARS", name: "Argentine Peso", symbol: "$" },
  { code: "CLP", name: "Chilean Peso", symbol: "$" },
  { code: "COP", name: "Colombian Peso", symbol: "$" },
  { code: "PEN", name: "Peruvian Sol", symbol: "S/" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "Rs." },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳" },
  { code: "NPR", name: "Nepalese Rupee", symbol: "रू" },
  { code: "ILS", name: "Israeli Shekel", symbol: "₪" },
  { code: "MAD", name: "Moroccan Dirham", symbol: "د.م." },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵" },
  { code: "XOF", name: "CFA Franc BCEAO", symbol: "CFA" },
];

export function CurrencySelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (currency: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = COMMON_CURRENCIES.find((c) => c.code === value) || COMMON_CURRENCIES[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-foreground/5 hover:bg-foreground/10 transition-colors text-sm font-medium w-full justify-between"
      >
        <span className="flex items-center gap-2">
          <span className="text-foreground/60">{current.symbol}</span>
          <span>{current.code}</span>
        </span>
        <span className="text-foreground/40 text-xs">{current.name}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-2 w-72 bg-background border border-foreground/10 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto py-1">
            {COMMON_CURRENCIES.map((cur) => (
              <button
                key={cur.code}
                type="button"
                onClick={() => {
                  onChange(cur.code);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-foreground/5 transition-colors ${
                  cur.code === value ? "bg-foreground/10 font-semibold" : ""
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-foreground/60 w-8">{cur.symbol}</span>
                  <span>{cur.code}</span>
                </span>
                <span className="text-foreground/40 text-xs">{cur.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
