import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import fs from 'fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const APP_VERSION_FILE = path.resolve(__dirname, 'src/lib/app-version.ts')

function readAppVersion(): string {
  const content = fs.readFileSync(APP_VERSION_FILE, 'utf8')
  const match = content.match(/APP_VERSION\s*=\s*["']([^"']+)["']/)
  if (!match) {
    throw new Error(`APP_VERSION não encontrado em ${APP_VERSION_FILE}`)
  }
  return match[1]
}

/** Injeta versão no HTML e invalida cache do cliente quando muda. */
function appVersionPlugin() {
  return {
    name: 'consorcio-app-version',
    transformIndexHtml(html: string) {
      const version = readAppVersion()
      const guardScript = `(function(){try{var V="${version}",k="contempla_app_version",p=localStorage.getItem(k);if(p&&p!==V){localStorage.setItem(k,V);location.reload();return}localStorage.setItem(k,V)}catch(e){}})();`

      let out = html.replace(/<meta name="application-version"[^>]*>\s*/gi, '')
      out = out.replace(
        /href="(\/favicon\.(?:ico|svg))"/g,
        `href="$1?v=${version}"`,
      )

      const inject = [
        `<meta name="application-version" content="${version}" />`,
        `<script>${guardScript}</script>`,
      ].join('\n      ')

      return out.replace('</head>', `      ${inject}\n    </head>`)
    },
  }
}

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
      appVersionPlugin(),
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
