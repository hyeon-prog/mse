import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base는 GitHub Pages(https://<user>.github.io/mse/arcade/) 배포 경로에 맞춘다
// — main 루트는 기존 retro platform이 쓰고 있어 arcade/ 하위로 배포한다
export default defineConfig({
  base: '/mse/arcade/',
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
