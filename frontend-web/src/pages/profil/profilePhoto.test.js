import test from 'node:test'
import assert from 'node:assert/strict'
import { createImageUploader } from '../../components/imageUploadUtils.js'
import { buildProfileUpdatePayload, createProfileSaver, readProfileResponse } from './profilePhoto.js'

test('keeps old profiles compatible when no photo is returned', () => {
  const state = readProfileResponse({ prenom: 'Amina', nom: 'Test' })
  assert.equal(state.photoProfilUrl, null)
})

test('uploads, saves and reloads a profile photo with the canonical field', async () => {
  const photoUrl = 'https://api.example.org/uploads/avatars/photo.webp'
  let persistedProfile = { prenom: 'Amina', nom: 'Test', languePreference: 'FR', photoProfilUrl: null }
  const api = {
    post: async () => ({ data: { url: photoUrl } }),
    put: async (_path, payload) => {
      persistedProfile = { ...persistedProfile, ...payload }
      return { data: persistedProfile }
    },
    get: async () => ({ data: persistedProfile }),
  }
  const uploader = createImageUploader({
    apiClient: api,
    allowedOrigins: ['https://api.example.org'],
    formDataFactory: () => ({ append() {} }),
  })

  const uploadedUrl = await uploader(
    { name: 'photo.webp', type: 'image/webp', size: 1024 },
    'photo-profil',
  )
  const payload = buildProfileUpdatePayload(
    { prenom: 'Amina', nom: 'Test', languePreference: 'FR' },
    uploadedUrl,
  )
  await api.put('/users/me', payload)
  const reloaded = readProfileResponse((await api.get('/users/me')).data)

  assert.equal(payload.photoProfilUrl, photoUrl)
  assert.equal(reloaded.photoProfilUrl, photoUrl)
})

test('coalesces simultaneous profile saves into one HTTP request', async () => {
  let resolveSave
  let calls = 0
  const pendingResponse = new Promise(resolve => { resolveSave = resolve })
  const saveProfile = createProfileSaver({
    put: () => { calls += 1; return pendingResponse },
  })
  const payload = buildProfileUpdatePayload(
    { prenom: 'Amina', nom: 'Test', languePreference: 'FR' },
    'https://api.example.org/uploads/avatars/photo.webp',
  )

  const first = saveProfile(payload)
  const second = saveProfile(payload)
  assert.strictEqual(first, second)
  assert.equal(calls, 1)
  resolveSave({ data: payload })
  await first
})
