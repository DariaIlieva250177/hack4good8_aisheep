import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// No @types/node in this project, so read the env without the `process` global type
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Under WSL, file changes on Windows drives (/mnt/c, /mnt/d) don't send
    // events, so the dev server would keep serving stale code. Poll there.
    watch: env.WSL_DISTRO_NAME ? { usePolling: true, interval: 300 } : undefined,
    // The data files sit outside this folder, in app/data.
    fs: { allow: ['..'] },
  },
})
