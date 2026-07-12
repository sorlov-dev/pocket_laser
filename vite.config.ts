import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Project is served from https://<user>.github.io/pocket_laser/ on Pages,
// so production assets need that base. Local dev stays at the root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/pocket_laser/' : '/',
  plugins: [react()],
}))
