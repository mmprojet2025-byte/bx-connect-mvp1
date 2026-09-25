import test from 'node:test'
import assert from 'node:assert/strict'
import { createImageUploader, getSafeImageUrl } from './imageUploadUtils.js'

const allowedOrigins = ['https://api.example.org']
const imageFile = { name: 'photo.webp', type: 'image/webp', size: 1024 }
const formDataFactory = () => ({ append() {} })

test('rejects dangerous and unauthorized image URLs', () => {
  for (const value of [
    'file:///tmp/photo.jpg',
    'javascript:alert(1)',
    'data:image/png;base64,AAAA',
    'https://evil.example/photo.jpg',
  ]) {
    assert.equal(getSafeImageUrl(value, { allowedOrigins }), null)
  }
})

test('surfaces an upload error without returning a photo URL', async () => {
  const uploader = createImageUploader({
    apiClient: { post: async () => { throw new Error('network') } },
    allowedOrigins,
    formDataFactory,
  })

  await assert.rejects(uploader(imageFile, 'photo-profil'), /network/)
})

test('coalesces simultaneous uploads into one HTTP request', async () => {
  let resolveUpload
  let calls = 0
  const pendingResponse = new Promise(resolve => { resolveUpload = resolve })
  const uploader = createImageUploader({
    apiClient: { post: () => { calls += 1; return pendingResponse } },
    allowedOrigins,
    formDataFactory,
  })

  const first = uploader(imageFile, 'photo-profil')
  const second = uploader(imageFile, 'photo-profil')
  assert.strictEqual(first, second)
  assert.equal(calls, 1)

  resolveUpload({ data: { url: 'https://api.example.org/uploads/avatars/photo.webp' } })
  assert.equal(await first, 'https://api.example.org/uploads/avatars/photo.webp')
})
