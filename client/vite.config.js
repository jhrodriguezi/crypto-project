import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    https: {
      key: './airbnb-clone-privateKey.key',
      cert:'./airbnb-clone.crt',
    }
  },
  plugins: [react()],
})
