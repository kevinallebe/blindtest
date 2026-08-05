import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Sans ceci, Vite n'écoute que sur l'adresse résolue par "localhost" (::1 sur ce Mac),
    // pas sur l'IPv4 littérale 127.0.0.1 utilisée par la redirect URI Spotify.
    host: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    globals: true,
  },
})
