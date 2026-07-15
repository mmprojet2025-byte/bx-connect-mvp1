import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import process from 'node:process'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const sentryRelease = env.VITE_SENTRY_RELEASE
  const sentryDist = env.SENTRY_DIST || env.VITE_SENTRY_DIST
  const enableSentrySourcemaps = command === 'build'
    && Boolean(env.SENTRY_AUTH_TOKEN)
    && Boolean(env.SENTRY_ORG)
    && Boolean(env.SENTRY_PROJECT)
    && Boolean(sentryRelease)

  return {
    build: {
      sourcemap: enableSentrySourcemaps ? 'hidden' : false,
    },
    plugins: [
      react(),
      tailwindcss(),
      ...(enableSentrySourcemaps ? [
        sentryVitePlugin({
          authToken: env.SENTRY_AUTH_TOKEN,
          org: env.SENTRY_ORG,
          project: env.SENTRY_PROJECT,
          telemetry: false,
          release: {
            name: sentryRelease,
            dist: sentryDist,
            setCommits: false,
          },
          sourcemaps: {
            assets: './dist/assets/**/*.{js,map}',
            filesToDeleteAfterUpload: './dist/**/*.map',
          },
        }),
      ] : []),
    ],
  }
})
