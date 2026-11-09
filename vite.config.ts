import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(),
    VitePWA({
      // 'prompt': a nova versão espera o usuário (src/components/UpdatePrompt.tsx); recarregar sozinho perderia exame não salvo.
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024 // 10MB
      },
      manifest: {
        name: 'AudioDash',
        short_name: 'AudioDash',
        description: 'Registro de exames audiológicos e laudos para fonoaudiólogos',
        lang: 'pt-BR',
        theme_color: '#ffffff',
        // shortcut: só o SVG existe em public/. Para o botão "Instalar" do Chrome em todos os casos, acrescentar
        // pwa-192x192.png e pwa-512x512.png (arte da marca) em public/ e listá-los aqui.
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  }
});
