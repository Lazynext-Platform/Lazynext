import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default async function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '40px',
        }}
      >
        {/* Red geometric L mark matching the Lazynext logo */}
        <svg width="120" height="140" viewBox="0 0 120 140">
          {/* Vertical bar */}
          <path d="M10 0 L45 0 L45 85 Q45 105 65 105 L10 105 Z" fill="#FF0000" />
          {/* Horizontal bar */}
          <path d="M45 105 L110 105 L110 140 L10 140 L10 105 Z" fill="#FF0000" />
          {/* Curved connector */}
          <path d="M45 0 Q45 105 110 105 L45 105 L45 0 Z" fill="#FF0000" opacity="0.85" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
