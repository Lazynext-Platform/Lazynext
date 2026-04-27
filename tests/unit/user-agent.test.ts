import { describe, it, expect } from 'vitest'
import { parseUserAgent, formatDeviceLabel } from '@/lib/utils/user-agent'

describe('parseUserAgent', () => {
  it('parses Chrome on macOS desktop', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    expect(parseUserAgent(ua)).toEqual({
      browser: 'Chrome',
      os: 'macOS',
      device: 'Desktop',
    })
  })

  it('parses Safari on iPhone as Mobile', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
    expect(parseUserAgent(ua)).toEqual({
      browser: 'Safari',
      os: 'iOS',
      device: 'Mobile',
    })
  })

  it('classifies iPad as Tablet even though it advertises Mac', () => {
    const ua =
      'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/604.1'
    const result = parseUserAgent(ua)
    expect(result.device).toBe('Tablet')
    expect(result.os).toBe('iOS')
  })

  it('parses Edge before Chrome (Edge UAs include Chrome token)', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0'
    expect(parseUserAgent(ua).browser).toBe('Edge')
  })

  it('parses Firefox on Linux desktop', () => {
    const ua = 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0'
    expect(parseUserAgent(ua)).toEqual({
      browser: 'Firefox',
      os: 'Linux',
      device: 'Desktop',
    })
  })

  it('returns all-Unknown for empty/null input', () => {
    expect(parseUserAgent(null)).toEqual({ browser: 'Unknown', os: 'Unknown', device: 'Unknown' })
    expect(parseUserAgent('')).toEqual({ browser: 'Unknown', os: 'Unknown', device: 'Unknown' })
    expect(parseUserAgent('   ')).toEqual({ browser: 'Unknown', os: 'Unknown', device: 'Unknown' })
  })

  it('returns Unknown for unrecognized UAs', () => {
    expect(parseUserAgent('curl/8.0.1')).toEqual({
      browser: 'Unknown',
      os: 'Unknown',
      device: 'Unknown',
    })
  })
})

describe('formatDeviceLabel', () => {
  it('formats a fully-known device', () => {
    expect(
      formatDeviceLabel({ browser: 'Chrome', os: 'macOS', device: 'Desktop' }),
    ).toBe('Chrome on macOS · Desktop')
  })

  it('drops Unknown OS segment', () => {
    expect(
      formatDeviceLabel({ browser: 'Chrome', os: 'Unknown', device: 'Desktop' }),
    ).toBe('Chrome · Desktop')
  })

  it('returns "Unknown device" when nothing is known', () => {
    expect(
      formatDeviceLabel({ browser: 'Unknown', os: 'Unknown', device: 'Unknown' }),
    ).toBe('Unknown device')
  })

  it('returns just device class when browser+os unknown but device known', () => {
    expect(
      formatDeviceLabel({ browser: 'Unknown', os: 'Unknown', device: 'Mobile' }),
    ).toBe('Mobile')
  })
})
