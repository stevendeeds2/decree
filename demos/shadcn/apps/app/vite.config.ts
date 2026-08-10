import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const root = path.dirname(fileURLToPath(import.meta.url))
const shadcnUi = path.resolve(root, '../../packages/ui')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Linked @demo/shadcn-ui must share the app's React (avoid Invalid hook call).
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(root, './src'),
      '@demo/shadcn-ui/utils': path.resolve(shadcnUi, 'src/lib/utils.ts'),
      '@demo/shadcn-ui': path.resolve(shadcnUi, 'src/components/ui'),
      react: path.resolve(root, 'node_modules/react'),
      'react-dom': path.resolve(root, 'node_modules/react-dom'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5180,
    fs: { allow: [root, shadcnUi] },
  },
})
