import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base는 GitHub Pages(https://<user>.github.io/mse/) 배포 경로에 맞춘다
export default defineConfig({
  base: '/mse/',
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
