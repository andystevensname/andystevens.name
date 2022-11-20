import { defineNuxtConfig } from "nuxt/config";

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  modules: [
    "@nuxt/content",
  ],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    }
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
  vite: {
    define: {
      __VUE_OPTIONS_API__: false,
    }
  }
});