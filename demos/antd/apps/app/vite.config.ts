import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const root = path.dirname(fileURLToPath(import.meta.url))
const ui = path.resolve(root, '../../packages/ui')

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@demo/antd-ui': path.resolve(ui, 'src/components'),
      react: path.resolve(root, 'node_modules/react'),
      'react-dom': path.resolve(root, 'node_modules/react-dom'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5200,
    strictPort: true,
    fs: { allow: [root, ui] },
  },
})
