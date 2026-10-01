import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, 'API_')
  const apiTarget = env.API_PROXY_TARGET || `http://127.0.0.1:${env.API_PORT || '8000'}`

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': apiTarget,
        '/media': apiTarget,
      },
    },
  }
})
