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
          backgroundColor: '#BEFF66',
          borderRadius: '40px',
        }}
      >
        {/* Lazynext mark — black quarter-circle + small black square on lime */}
        <svg width="120" height="120" viewBox="0 0 32 32">
          <path d="M6 6 L18 6 A12 12 0 0 1 18 18 L18 24 L6 24 Z" fill="#0A0A0A" />
          <path d="M20 20 L26 20 L26 26 L20 26 Z" fill="#0A0A0A" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
