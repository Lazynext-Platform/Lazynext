import { POST } from '../route'
import { NextRequest } from 'next/server'

describe('Subtitles API', () => {
  it('should return a 200 processing status on valid request', async () => {
    const req = new NextRequest('http://localhost/api/ai/subtitles', {
      method: 'POST',
      body: JSON.stringify({ videoUrl: 'test.mp4' })
    })

    const response = await POST(req)
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data.status).toBe('processing')
    expect(data.jobId).toBeDefined()
  })

  it('should return a 400 error on invalid request', async () => {
    const req = new NextRequest('http://localhost/api/ai/subtitles', {
      method: 'POST',
      body: JSON.stringify({}) // missing videoUrl
    })

    const response = await POST(req)
    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data.error).toBe('Missing video URL')
  })
})
