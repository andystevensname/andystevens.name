import { defineNuxtConfig } from "nuxt/config";
import { webpack } from "webpack"

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  modules: ["@nuxt/content", "@nuxtjs/tailwindcss"],
  css: ["@fortawesome/fontawesome-svg-core/styles.css"],
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