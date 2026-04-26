import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Lazynext — The Anti-Software Workflow Platform'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#020617',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {/* Grid dots background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.08,
            backgroundImage: 'radial-gradient(circle, #64748b 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Logo mark on a lime card so the brand color pops on dark bg */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '32px',
            backgroundColor: '#BEFF66',
            padding: '20px 32px',
            borderRadius: '20px',
          }}
        >
          <svg width="72" height="72" viewBox="0 0 32 32">
            <path d="M6 6 L18 6 A12 12 0 0 1 18 18 L18 24 L6 24 Z" fill="#0A0A0A" />
            <path d="M20 20 L26 20 L26 26 L20 26 Z" fill="#0A0A0A" />
          </svg>
          <span
            style={{
              fontSize: '56px',
              fontWeight: 800,
              color: '#0A0A0A',
              letterSpacing: '-2px',
            }}
          >
            Lazynext
          </span>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: '28px',
            color: '#94a3b8',
            maxWidth: '700px',
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          One platform that replaces every tool your team is already misusing.
        </p>

        {/* Node type pills */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginTop: '40px',
          }}
        >
          {[
            { label: 'Tasks', color: '#3b82f6' },
            { label: 'Docs', color: '#10b981' },
            { label: 'Decisions', color: '#f97316' },
            { label: 'Threads', color: '#a855f7' },
            { label: 'AI', color: '#06b6d4' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: `${item.color}20`,
                border: `1px solid ${item.color}40`,
                borderRadius: '9999px',
                padding: '8px 20px',
                fontSize: '18px',
                color: item.color,
                fontWeight: 600,
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: item.color,
                }}
              />
              {item.label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
