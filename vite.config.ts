import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import fs from 'fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

/** Copia .htaccess e 404.html para dist/ (rotas SPA no Apache/Hostinger). */
function spaDeployAssets() {
  return {
    name: 'consorcio-spa-deploy-assets',
    closeBundle() {
      const root = path.resolve(__dirname)
      const dist = path.join(root, 'dist')
      const htaccess = path.join(root, '.htaccess')
      if (!fs.existsSync(dist) || !fs.existsSync(htaccess)) return
      fs.copyFileSync(htaccess, path.join(dist, '.htaccess'))
      const indexHtml = path.join(dist, 'index.html')
      if (fs.existsSync(indexHtml)) {
        fs.copyFileSync(indexHtml, path.join(dist, '404.html'))
      }
    },
  }
}


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
  /** Dev local: PHP embutido em :8000. WAMP/Apache: defina VITE_WAMP_* no .env.local */
  const useLocalPhpServer = mode === 'php-api' || mode === 'development'
  const wampPrefix =
    (env.VITE_WAMP_API_PREFIX ?? '').trim() ||
    (useLocalPhpServer ? '/api' : '/consorcio/api')
  const apiTarget =
    (env.VITE_WAMP_API_TARGET ?? '').trim() ||
    (useLocalPhpServer ? 'http://localhost:8000' : 'http://127.0.0.1')

  return {
    plugins: [
      figmaAssetResolver(),
      react(),
      tailwindcss(),
      spaDeployAssets(),
      {
        name: 'consorcio-api-proxy-hint',
        configureServer(server) {
          server.httpServer?.once('listening', () => {
            const builtin = apiTarget.includes(':8000') || apiTarget.includes(':8090')
            // eslint-disable-next-line no-console
            console.log(
              builtin
                ? `\n  [consorcio] Proxy /api → ${apiTarget}${wampPrefix}  (inicie a API: npm run dev:api ou npm run dev:full)\n`
                : `\n  [consorcio] Proxy /api → ${apiTarget}${wampPrefix}/  (Apache/WAMP; ECONNREFUSED = serviço parado)\n`,
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
