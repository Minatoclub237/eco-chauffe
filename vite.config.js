import { defineConfig } from 'vite'

export default defineConfig({
  server: { port: 6010, strictPort: true },
  preview: { port: 6010, strictPort: true },
  build: { rollupOptions: { input: { main: 'index.html', mentions: 'mentions-legales.html', confidentialite: 'confidentialite.html', en: 'en/index.html', enLegal: 'en/legal-notice.html', enPrivacy: 'en/privacy.html' } } },
})
