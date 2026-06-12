import { describe, it, expect, beforeAll, afterAll, spyOn, type Mock } from 'bun:test'
import { POST } from '../route'
import { NextRequest } from 'next/server'

describe('Subtitles API', () => {
  let fetchSpy: Mock<any>;

  beforeAll(() => {
    fetchSpy = spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
  });

  afterAll(() => {
    fetchSpy.mockRestore();
  });

  it('should return a 200 processing status on valid request', async () => {
    const req = new NextRequest('http://localhost/api/ai/subtitles', {
      method: 'POST',
      body: JSON.stringify({ videoId: 'test.mp4' })
    })

    const response = await POST(req)
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.subtitles).toBeDefined()
  })

  it('should return a 400 error on invalid request', async () => {
    const req = new NextRequest('http://localhost/api/ai/subtitles', {
      method: 'POST',
      body: JSON.stringify({}) // missing videoId
    })

    const response = await POST(req)
    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data.error).toBe('Video ID is required')
  })
})
