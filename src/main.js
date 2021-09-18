// This is the main.js file. Import global CSS and scripts here.
// The Client API can be used here. Learn more: gridsome.org/docs/client-api
require('~/main.css')

import DefaultLayout from '~/layouts/Default.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { config, library } from '@fortawesome/fontawesome-svg-core'
import { faBars, faTimes } from '@fortawesome/free-solid-svg-icons'
import { faGithub, faTwitter } from '@fortawesome/free-brands-svg-icons'
import '@fortawesome/fontawesome-svg-core/styles.css'
import 'prismjs/themes/prism.css'
// Prism default CSS about line numbers
import 'prismjs/plugins/line-numbers/prism-line-numbers.css'

config.autoAddCss = false;
library.add(faGithub, faTwitter, faBars, faTimes)

export default function (Vue, { router, head, isClient }) {
  if (isClient) {
    const { VueHammer } = require('vue2-hammer')
    Vue.use(VueHammer)
}
  // Set default layout as a global component
  Vue.component('Layout', DefaultLayout)
  Vue.component('font-awesome', FontAwesomeIcon)
  head.link.push({
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css?family=Fjalla+One'
  })
}