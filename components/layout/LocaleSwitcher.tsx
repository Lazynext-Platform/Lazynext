'use client'

import { useState, useRef, useEffect } from 'react'
import { Globe, ChevronDown } from 'lucide-react'
import { useUIStore } from '@/stores/ui.store'
import { locales, currencies, type Currency } from '@/lib/i18n/config'
import { cn } from '@/lib/utils/cn'

const LOCALE_LABELS: Record<string, string> = {
  en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch', pt: 'Português',
  ja: '日本語', ko: '한국어', zh: '中文', ar: 'العربية', hi: 'हिन्दी',
  it: 'Italiano', nl: 'Nederlands', ru: 'Русский', tr: 'Türkçe', pl: 'Polski',
  sv: 'Svenska', da: 'Dansk', fi: 'Suomi', nb: 'Norsk', uk: 'Українська',
  th: 'ไทย', vi: 'Tiếng Việt', id: 'Bahasa Indonesia', ms: 'Bahasa Melayu',
  tl: 'Filipino', cs: 'Čeština', ro: 'Română', hu: 'Magyar', el: 'Ελληνικά',
  he: 'עברית', bn: 'বাংলা', ta: 'தமிழ்', te: 'తెలుగు', mr: 'मराठी',
  gu: 'ગુજરાતી', kn: 'ಕನ್ನಡ', ml: 'മലയാളം', pa: 'ਪੰਜਾਬੀ', ur: 'اردو', sw: 'Kiswahili',
}

const CURRENCY_LABELS: Record<string, string> = {
  USD: 'USD ($)', EUR: 'EUR (€)', GBP: 'GBP (£)', JPY: 'JPY (¥)', CNY: 'CNY (¥)',
  INR: 'INR (₹)', BRL: 'BRL (R$)', KRW: 'KRW (₩)', AUD: 'AUD ($)', CAD: 'CAD ($)',
  CHF: 'CHF', MXN: 'MXN ($)', SGD: 'SGD ($)', HKD: 'HKD ($)', NOK: 'NOK (kr)',
  SEK: 'SEK (kr)', DKK: 'DKK (kr)', NZD: 'NZD ($)', ZAR: 'ZAR (R)', TRY: 'TRY (₺)',
  PLN: 'PLN (zł)', THB: 'THB (฿)', IDR: 'IDR (Rp)', MYR: 'MYR (RM)', PHP: 'PHP (₱)',
  CZK: 'CZK (Kč)', ILS: 'ILS (₪)', SAR: 'SAR (﷼)', AED: 'AED (د.إ)', PKR: 'PKR (₨)',
  BDT: 'BDT (৳)', RUB: 'RUB (₽)', NGN: 'NGN (₦)', KES: 'KES (KSh)', EGP: 'EGP (E£)',
}

// Show a curated list of popular currencies first
const POPULAR_CURRENCIES: Currency[] = [
  'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'BRL', 'KRW', 'AUD', 'CAD',
  'CHF', 'MXN', 'SGD', 'SAR', 'AED',
]

type Tab = 'language' | 'currency'

export function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('language')
  const [search, setSearch] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const currency = useUIStore((s) => s.currency)
  const setCurrency = useUIStore((s) => s.setCurrency)

  // Read current locale from cookie
  const currentLocale = (typeof document !== 'undefined'
    ? document.cookie.match(/NEXT_LOCALE=(\w+)/)?.[1]
    : 'en') ?? 'en'

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const setLocale = (locale: string) => {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=lax`
    window.location.reload()
  }

  const filteredLocales = locales.filter((l) => {
    const label = LOCALE_LABELS[l] ?? l
    return label.toLowerCase().includes(search.toLowerCase()) || l.includes(search.toLowerCase())
  })

  const allCurrencies = [...new Set([...POPULAR_CURRENCIES, ...currencies])]
  const filteredCurrencies = allCurrencies.filter((c) => {
    const label = CURRENCY_LABELS[c] ?? c
    return label.toLowerCase().includes(search.toLowerCase()) || c.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => { setOpen(!open); setSearch('') }}
        className={cn(
          'flex items-center gap-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors',
          compact ? 'p-2' : 'w-full px-3 py-2'
        )}
        aria-label="Change language or currency"
      >
        <Globe className="h-4 w-4" />
        {!compact && (
          <>
            <span className="flex-1 text-left">{LOCALE_LABELS[currentLocale] ?? currentLocale} · {currency}</span>
            <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
          </>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-64 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl animate-in slide-in-from-bottom-2 duration-150 z-50">
          {/* Tabs */}
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => { setTab('language'); setSearch('') }}
              className={cn(
                'flex-1 px-3 py-2.5 text-xs font-semibold transition-colors',
                tab === 'language' ? 'text-brand border-b-2 border-brand' : 'text-slate-500 hover:text-slate-300'
              )}
            >
              Language
            </button>
            <button
              onClick={() => { setTab('currency'); setSearch('') }}
              className={cn(
                'flex-1 px-3 py-2.5 text-xs font-semibold transition-colors',
                tab === 'currency' ? 'text-brand border-b-2 border-brand' : 'text-slate-500 hover:text-slate-300'
              )}
            >
              Currency
            </button>
          </div>

          {/* Search */}
          <div className="p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === 'language' ? 'Search language...' : 'Search currency...'}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-brand focus:outline-none"
            />
          </div>

          {/* Options */}
          <div className="max-h-56 overflow-y-auto scrollbar-thin px-1 pb-2">
            {tab === 'language' ? (
              filteredLocales.map((locale) => (
                <button
                  key={locale}
                  onClick={() => { setLocale(locale); setOpen(false) }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs transition-colors',
                    locale === currentLocale
                      ? 'bg-brand/10 text-brand font-medium'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  )}
                >
                  <span>{LOCALE_LABELS[locale] ?? locale}</span>
                  <span className="text-slate-600 uppercase">{locale}</span>
                </button>
              ))
            ) : (
              filteredCurrencies.map((cur) => (
                <button
                  key={cur}
                  onClick={() => { setCurrency(cur); setOpen(false) }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs transition-colors',
                    cur === currency
                      ? 'bg-brand/10 text-brand font-medium'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  )}
                >
                  <span>{CURRENCY_LABELS[cur] ?? cur}</span>
                  {POPULAR_CURRENCIES.includes(cur) && cur !== currency && (
                    <span className="text-2xs text-slate-600">Popular</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
