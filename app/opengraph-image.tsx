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

        {/* Logo mark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              backgroundColor: '#4F6EF7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 800,
              color: 'white',
            }}
          >
            L
          </div>
          <span
            style={{
              fontSize: '48px',
              fontWeight: 700,
              color: 'white',
              letterSpacing: '-1px',
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
