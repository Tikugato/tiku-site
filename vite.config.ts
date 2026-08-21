import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const REQUIRED_ENV = ['VITE_SITE_TITLE', 'VITE_SITE_NAME', 'VITE_LINKEDIN_URL']
const TIKUGATO_TITLE = 'Tiku'

function siteTitle(title: string): Plugin {
  return {
    name: 'site-title',
    transformIndexHtml: (html) => html.replace('%SITE_TITLE%', title),
  }
}

function resolveTitle(site: string, mode: string): string {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const provided = REQUIRED_ENV.filter((key) => env[key])
  if (site !== 'prv') {
    if (provided.length) {
      throw new Error(
        `${provided.join(', ')} set but --mode prv was not passed, so this would ship ` +
          `the tikugato site. Use "npm run build:prv" as the build command.`,
      )
    }
    return TIKUGATO_TITLE
  }
  const missing = REQUIRED_ENV.filter((key) => !env[key])
  if (missing.length) {
    throw new Error(
      `Missing ${missing.join(', ')}. Set these in .env.prv.local locally, ` +
        `or as Cloudflare build variables (the Build section, not runtime).`,
    )
  }
  return env.VITE_SITE_TITLE as string
}

export default defineConfig(({ mode }) => {
  const site = mode === 'prv' ? 'prv' : 'tikugato'
  const title = resolveTitle(site, mode)
  console.log(`[identity] building ${site} (mode=${mode})`)
  return {
    publicDir: `public/${site}`,
    plugins: [
      vue(),
      vueDevTools(),
      siteTitle(title),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@identity': fileURLToPath(new URL(`./src/identity/${site}.ts`, import.meta.url)),
      },
    },
  }
})
