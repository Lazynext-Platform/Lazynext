// Minimal user-agent parser for the Profile → Sessions tab.
// Deliberately small (no `ua-parser-js` dep): we only need the browser family,
// OS family, and device class — enough to label the current session honestly
// without claiming we can fingerprint the device.
//
// If the user-agent is missing, malformed, or doesn't match any known token,
// every field falls back to `'Unknown'`. Callers must render that gracefully.

export interface ParsedUserAgent {
  browser: string
  os: string
  device: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown'
}

const BROWSERS: Array<{ name: string; pattern: RegExp }> = [
  // Order matters: Edge advertises "Chrome" too, so it must match first.
  { name: 'Edge', pattern: /Edg(e|A|iOS)?\//i },
  { name: 'Opera', pattern: /OPR\/|Opera\//i },
  // Brave injects no UA token — it shows up as Chrome. Honest call: we can't
  // tell. Don't pretend.
  { name: 'Firefox', pattern: /Firefox\//i },
  { name: 'Chrome', pattern: /Chrome\//i },
  { name: 'Safari', pattern: /Safari\//i },
]

const OPERATING_SYSTEMS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'iOS', pattern: /iPhone|iPad|iPod/i },
  { name: 'Android', pattern: /Android/i },
  { name: 'macOS', pattern: /Mac OS X|Macintosh/i },
  { name: 'Windows', pattern: /Windows NT/i },
  { name: 'Linux', pattern: /Linux/i },
]

export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  if (!ua || typeof ua !== 'string' || ua.trim().length === 0) {
    return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' }
  }

  const browser = BROWSERS.find((b) => b.pattern.test(ua))?.name ?? 'Unknown'
  const os = OPERATING_SYSTEMS.find((o) => o.pattern.test(ua))?.name ?? 'Unknown'

  // Device class: iPad/Android-tablets are tablet, phones are mobile,
  // everything else is desktop. Tablets-as-Mobile is a common mistake — iPads
  // since iPadOS 13 advertise as Mac, so we look at the iPad token first.
  let device: ParsedUserAgent['device'] = 'Unknown'
  if (/iPad/i.test(ua)) device = 'Tablet'
  else if (/Tablet/i.test(ua) && /Android/i.test(ua)) device = 'Tablet'
  else if (/iPhone|iPod|Mobile|Android/i.test(ua)) device = 'Mobile'
  else if (/Windows NT|Macintosh|Linux/i.test(ua)) device = 'Desktop'

  return { browser, os, device }
}

export function formatDeviceLabel(parsed: ParsedUserAgent): string {
  // "Chrome on macOS · Desktop" — drops Unknown segments rather than printing
  // them so the UI doesn't say "Unknown on Unknown · Unknown".
  const parts: string[] = []
  if (parsed.browser !== 'Unknown') parts.push(parsed.browser)
  if (parsed.os !== 'Unknown') parts.push(`on ${parsed.os}`)
  const left = parts.join(' ')
  if (parsed.device !== 'Unknown' && left.length > 0) {
    return `${left} · ${parsed.device}`
  }
  if (parsed.device !== 'Unknown') return parsed.device
  return left || 'Unknown device'
}
