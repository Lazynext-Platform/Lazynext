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
          backgroundColor: '#020617',
          borderRadius: '40px',
          fontSize: '100px',
          fontWeight: 800,
          color: 'white',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '28px',
            backgroundColor: '#4F6EF7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          L
        </div>
      </div>
    ),
    { ...size }
  )
}
