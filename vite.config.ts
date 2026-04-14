import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const wampPrefix = (env.VITE_WAMP_API_PREFIX ?? '').trim() || '/consorcio/api'
  const apiTarget = (env.VITE_WAMP_API_TARGET ?? '').trim() || 'http://127.0.0.1'

  return {
    plugins: [
      figmaAssetResolver(),
      react(),
      tailwindcss(),
      {
        name: 'consorcio-api-proxy-hint',
        configureServer(server) {
          server.httpServer?.once('listening', () => {
            const builtin = apiTarget.includes(':8090') || mode === 'php-api'
            // eslint-disable-next-line no-console
            console.log(
              builtin
                ? `\n  [consorcio] Proxy /api → ${apiTarget}${wampPrefix}  (PHP embutido; rode npm run dev:full se a API não estiver no ar)\n`
                : `\n  [consorcio] Proxy /api → ${apiTarget}${wampPrefix}/  (Apache/WAMP na porta do target; ECONNREFUSED = serviço parado — ou use npm run dev:full)\n`,
            )
          })
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, wampPrefix),
        },
      },
    },
    assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
