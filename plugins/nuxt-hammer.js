import { NuxtHammer } from "nuxt-hammer";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(NuxtHammer);
});
