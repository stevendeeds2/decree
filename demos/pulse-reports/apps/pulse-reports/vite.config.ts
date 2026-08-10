import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const root = path.dirname(fileURLToPath(import.meta.url))
const pulseUi = path.resolve(root, '../../packages/pulse-ui')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Linked @pulse/ui must share the app's React (avoid Invalid hook call).
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(root, './src'),
      '@pulse/ui/utils': path.resolve(pulseUi, 'src/lib/utils.ts'),
      '@pulse/ui': path.resolve(pulseUi, 'src/components/ui'),
      react: path.resolve(root, 'node_modules/react'),
      'react-dom': path.resolve(root, 'node_modules/react-dom'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5180,
    fs: { allow: [root, pulseUi] },
  },
})
