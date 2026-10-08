import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { resolveApiBaseUrl } from './apiBaseUrl.js'

const frontendRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const viteCli = join(frontendRoot, 'node_modules/vite/bin/vite.js')
const railwayApiUrl = 'https://bx-connect-mvp1-preproduction.up.railway.app/api'

test('allows localhost explicitly outside deployment builds', () => {
  assert.equal(
    resolveApiBaseUrl('http://localhost:8080/api'),
    'http://localhost:8080/api',
  )
  assert.equal(
    resolveApiBaseUrl(undefined, { fallback: 'http://localhost:8080/api' }),
    'http://localhost:8080/api',
  )
})

test('rejects a deployment build without VITE_API_BASE_URL', () => {
  assert.throws(
    () => resolveApiBaseUrl(undefined, { deployment: true }),
    /VITE_API_BASE_URL is required for deployment builds/,
  )
})

test('accepts a non-local HTTPS URL for deployment builds', () => {
  assert.equal(
    resolveApiBaseUrl('https://bx-connect-mvp1-preproduction.up.railway.app/api', { deployment: true }),
    'https://bx-connect-mvp1-preproduction.up.railway.app/api',
  )
})

test('rejects localhost for deployment builds', () => {
  for (const value of [
    'http://localhost:8080/api',
    'https://localhost/api',
    'http://127.0.0.1:8080/api',
  ]) {
    assert.throws(
      () => resolveApiBaseUrl(value, { deployment: true }),
      /non-local HTTPS URL for deployment builds/,
    )
  }
})

test('Vite refuses a deployment build without VITE_API_BASE_URL', () => {
  // Une valeur vide explicite prime sur les .env que Vite charge ensuite.
  const env = { ...process.env, VITE_API_BASE_URL: '', SENTRY_AUTH_TOKEN: '' }

  const result = spawnSync(process.execPath, [viteCli, 'build'], {
    cwd: frontendRoot,
    env,
    encoding: 'utf8',
  })

  assert.notEqual(result.status, 0)
  assert.match(
    `${result.stdout}\n${result.stderr}`,
    /VITE_API_BASE_URL is required for deployment builds/,
  )
})

test('a Railway deployment bundle contains no localhost API URL', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'bx-connect-web-build-'))

  try {
    const result = spawnSync(
      process.execPath,
      [viteCli, 'build', '--outDir', outDir, '--emptyOutDir'],
      {
        cwd: frontendRoot,
        env: { ...process.env, VITE_API_BASE_URL: railwayApiUrl, SENTRY_AUTH_TOKEN: '' },
        encoding: 'utf8',
      },
    )

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
    const bundle = readdirSync(join(outDir, 'assets'))
      .filter(file => file.endsWith('.js'))
      .map(file => readFileSync(join(outDir, 'assets', file), 'utf8'))
      .join('\n')

    assert.match(bundle, new RegExp(railwayApiUrl.replaceAll('.', '\\.')))
    assert.doesNotMatch(bundle, /http:\/\/localhost:8080\/api/)
  } finally {
    rmSync(outDir, { recursive: true, force: true })
  }
})
