import { defineNuxtConfig } from "nuxt/config";

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  modules: [
    "@nuxt/content"
  ],
  postcss: {
    plugins: {
      '@tailwindcss/postcss': {},
    },
  },
  css: [
    "~/assets/css/tailwind.css",
    "@fortawesome/fontawesome-svg-core/styles.css"
  ],
  build: {
    transpile: [
      '@fortawesome/fontawesome-svg-core',
      '@fortawesome/free-solid-svg-icons'
    ]
  },
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ["/about", "/writing"],
    },
  },
  routeRules: {
    '/**': {
      headers: {
        'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; img-src 'self' data:;",
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    },
  },
  vite: {
    define: {
      __VUE_OPTIONS_API__: false,
    }
  }
});